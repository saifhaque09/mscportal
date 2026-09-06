<?php

namespace App\Http\Controllers;

use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Modules\Organizations\Models\IndividualUserAssignment;

abstract class BaseController
{
    /**
     * Send success response
     */
    public function sendResponse ($message='', $result=[], $code = 200) {
        $response = [
            'success' => true,
            'message' => $message,
            'payload' => $result,
        ];

        return response()->json($response, $code);
    }

    /**
     * Send error response
     */
    public function sendError ($errorMessages = [], $code = 501) {
        $response = [
            'success' => false,
            'message' => $errorMessages,
        ];

        return response()->json($response, $code);
    }

    /**
     * True if the authenticated user has cross-firm ("staff") access via the
     * given manage-tier permission (Accountant/Staff/Admin), independent of
     * which specific firm is being accessed.
     */
    protected function isFirmStaff (string $managePermission = 'firms.manage'): bool {
        return (bool) auth()->user()?->can($managePermission);
    }

    /**
     * True if the authenticated user may access data scoped to $firmId:
     * either they hold the manage-tier permission (cross-firm staff access),
     * or they belong to that specific firm (Employee/Client — own firm only).
     * Taxfiler/User/unassigned accounts have firm_id = null and are denied.
     *
     * Two-tier model: when $orgPermissionCode is given, holding the Spatie
     * manage-tier permission is only "eligible in principle" for
     * Accountant/Staff — they additionally need an OrganizationUserAssignment
     * on this specific firm whose role grants that org-permission (see
     * app/Modules/Organizations). Employee/Client are unaffected by this —
     * the org-role system doesn't apply to them, they stay on the firm_id
     * ownership check. Leaving $orgPermissionCode null preserves the old
     * "any staff, any firm" behavior, for action areas not yet mapped to an
     * org-permission (see PermissionSeeder / Organizations module docblocks).
     *
     * $blockStaffWrite: set true by callers guarding a write action (upload,
     * edit, delete — as opposed to view/list) where the platform Staff role
     * must stay read-only regardless of which org-role (lead_acc/senior/
     * dataloader) they've been assigned on this firm — the org-role system
     * only ever grants Staff MORE access on a firm, never less, so this is
     * the one place that has to override it. Accountant is unaffected.
     */
    protected function authorizeFirmScope ($firmId, string $managePermission = 'firms.manage', ?string $orgPermissionCode = null, bool $blockStaffWrite = false): bool {
        $user = auth()->user();
        if (! $user) {
            return false;
        }
        if ($user->hasRole('Admin')) {
            return true;
        }
        if ($blockStaffWrite && $user->hasRole('Staff')) {
            return false;
        }
        // The org-role system (OrganizationUserAssignment) only ever applies to
        // Accountant/Staff. Employee/Client can incidentally hold a Spatie
        // permission named the same as $managePermission (e.g. Client has
        // invites.view) without that meaning anything about org-role
        // assignment, so they must never be routed into the
        // hasOrgPermissionOnFirm() branch below — they stay on firm_id
        // ownership regardless of which permission they hold.
        if ($orgPermissionCode !== null && ($user->hasRole('Client') || $user->hasRole('Employee'))) {
            return $user->firm_id !== null && (int) $user->firm_id === (int) $firmId;
        }
        if ($user->can($managePermission)) {
            if ($orgPermissionCode === null) {
                return true;
            }
            return $this->hasOrgPermissionOnFirm($user, $firmId, $orgPermissionCode);
        }
        return $user->firm_id !== null && (int) $user->firm_id === (int) $firmId;
    }

    /**
     * For manage-tier, staff-only actions where Employee/Client should never
     * be allowed regardless of firm ownership (e.g. editing a firm's own
     * business record). Admin bypasses; otherwise requires both the Spatie
     * manage-tier permission and an OrganizationUserAssignment on this firm
     * granting $orgPermissionCode. The platform Staff role is always denied
     * here — every caller of this method is a write/manage action, and Staff
     * must stay read-only regardless of which org-role they hold on the firm
     * (see authorizeFirmScope()'s $blockStaffWrite docblock for why).
     */
    protected function authorizeFirmManageAction ($firmId, string $managePermission, string $orgPermissionCode): bool {
        $user = auth()->user();
        if (! $user) {
            return false;
        }
        if ($user->hasRole('Admin')) {
            return true;
        }
        if ($user->hasRole('Staff')) {
            return false;
        }
        if (! $user->can($managePermission)) {
            return false;
        }
        return $this->hasOrgPermissionOnFirm($user, $firmId, $orgPermissionCode);
    }

    /**
     * True if $user holds an active OrganizationUserAssignment on $firmId
     * whose org role grants the permission identified by $orgPermissionCode.
     */
    private function hasOrgPermissionOnFirm ($user, $firmId, string $orgPermissionCode): bool {
        return OrganizationUserAssignment::where('firm_id', $firmId)
            ->where('user_id', $user->id)
            ->whereHas('organizationRole', function ($query) use ($orgPermissionCode) {
                $query->where('status', 'active')
                    ->whereHas('permissions', function ($permQuery) use ($orgPermissionCode) {
                        $permQuery->where('code', $orgPermissionCode)->where('status', 'active');
                    });
            })
            ->exists();
    }

    /**
     * Firm ids the authenticated user holds an active OrganizationUserAssignment
     * on, granting the access_business_account org-permission — the "my
     * clients" scope used across dashboard counts and the firm list for
     * non-Admin Accountant/Staff.
     */
    protected function myAssignedFirmIds () {
        return OrganizationUserAssignment::where('user_id', auth()->id())
            ->whereHas('organizationRole', function ($query) {
                $query->where('status', 'active')
                    ->whereHas('permissions', function ($permQuery) {
                        $permQuery->where('code', 'access_business_account')->where('status', 'active');
                    });
            })
            ->pluck('firm_id');
    }

    /**
     * True if the authenticated user may access data scoped to $targetUserId:
     * either it's their own record (self-service — e.g. a Taxfiler's own tax
     * documents), or they're staff (Accountant/Staff) AND hold
     * $staffPermission, acting on a taxfiler's behalf. Admin bypasses.
     *
     * Deliberately requires isFirmStaff() (holds firms.manage) in addition to
     * $staffPermission, not $staffPermission alone: permissions like
     * tax-documents.view/upload are held by Taxfiler too, for their own
     * self-service actions on the very same routes this guards. Checking
     * $staffPermission alone would let any Taxfiler holding it reach *other*
     * taxfilers' data via the "eligible" branch — the isFirmStaff() gate is
     * what actually distinguishes "staff acting on someone's behalf" from
     * "a taxfiler with the permission for their own data."
     *
     * Staff eligibility beyond that is scoped via individual_user_assignments
     * (see IndividualUserAssignment / Organizations\Taxfilers — the taxfiler
     * counterpart of organization_user_assignments): a taxfiler with no
     * assignments at all is visible to any eligible staff member
     * (grandfathered — same reasoning as Individual\Users::listTaxfilers());
     * once at least one person is assigned, only assigned staff can reach it.
     * $orgPermissionCode, when given, additionally requires the acting
     * staff member's specific assigned role on this taxfiler to grant that
     * permission — mirroring authorizeFirmScope()'s two-tier model. Left
     * null, any of the taxfiler's assigned staff qualifies (today's default
     * for callers not yet mapped to a specific org-permission).
     */
    protected function authorizeUserScope ($targetUserId, string $staffPermission, ?string $orgPermissionCode = null): bool {
        $user = auth()->user();
        if (! $user) {
            return false;
        }
        if ($user->hasRole('Admin')) {
            return true;
        }
        if ((int) $user->id === (int) $targetUserId) {
            return true;
        }
        if (! $this->isFirmStaff() || ! $user->can($staffPermission)) {
            return false;
        }

        $hasAnyAssignment = IndividualUserAssignment::where('taxfiler_id', $targetUserId)->exists();
        if (! $hasAnyAssignment) {
            return true;
        }

        if ($orgPermissionCode === null) {
            return IndividualUserAssignment::where('taxfiler_id', $targetUserId)
                ->where('user_id', $user->id)
                ->exists();
        }

        return $this->hasOrgPermissionOnTaxfiler($user, $targetUserId, $orgPermissionCode);
    }

    /**
     * True if $user holds an active IndividualUserAssignment on
     * $targetUserId (a taxfiler) whose org role grants the permission
     * identified by $orgPermissionCode.
     */
    private function hasOrgPermissionOnTaxfiler ($user, $targetUserId, string $orgPermissionCode): bool {
        return IndividualUserAssignment::where('taxfiler_id', $targetUserId)
            ->where('user_id', $user->id)
            ->whereHas('organizationRole', function ($query) use ($orgPermissionCode) {
                $query->where('status', 'active')
                    ->whereHas('permissions', function ($permQuery) use ($orgPermissionCode) {
                        $permQuery->where('code', $orgPermissionCode)->where('status', 'active');
                    });
            })
            ->exists();
    }

}

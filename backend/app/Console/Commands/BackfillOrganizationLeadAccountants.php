<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\OrganizationUserAssignment;

/**
 * One-time bootstrap for the two-tier org-permission model (see
 * BaseController::authorizeFirmManageAction). That model denies
 * Accountant/Staff access to a firm's Checklists/Documents/edit actions
 * unless they hold an OrganizationUserAssignment on that specific firm —
 * but every firm that existed before that model shipped has zero
 * assignments, so every current Accountant/Staff is locked out everywhere
 * until someone runs this.
 */
class BackfillOrganizationLeadAccountants extends Command
{
    protected $signature   = 'organizations:backfill-lead-accountant {--dry-run : Show what would change without writing anything}';
    protected $description = 'Assign the first Accountant in the database as Lead Accountant on every firm that currently has no Lead Accountant. Idempotent — safe to re-run.';

    public function handle(): int
    {
        $leadAccRole = OrganizationRole::where('code', 'lead_acc')->where('status', 'active')->first();
        if (! $leadAccRole) {
            $this->error('No active "lead_acc" OrganizationRole found — run OrganizationRoleSeeder first.');
            return self::FAILURE;
        }

        $firstAccountant = User::whereHas('roles', fn ($q) => $q->where('name', 'Accountant'))
            ->orderBy('id')
            ->first();

        if (! $firstAccountant) {
            $this->error('No user holds the Accountant role — nothing to backfill.');
            return self::FAILURE;
        }

        $this->info(sprintf(
            'Backfill target: %s %s (#%d, %s)',
            $firstAccountant->first_name,
            $firstAccountant->last_name,
            $firstAccountant->id,
            $firstAccountant->email
        ));

        $alreadyAssignedFirmIds = OrganizationUserAssignment::where('organization_role_id', $leadAccRole->id)
            ->pluck('firm_id');

        $firmsMissingLeadAccountant = Firm::whereNotIn('id', $alreadyAssignedFirmIds)->get(['id', 'guid', 'firm_name']);

        if ($firmsMissingLeadAccountant->isEmpty()) {
            $this->info('Every firm already has a Lead Accountant assigned. Nothing to do.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');

        foreach ($firmsMissingLeadAccountant as $firm) {
            if ($dryRun) {
                $this->line("Would assign: firm #{$firm->id} ({$firm->firm_name})");
                continue;
            }

            OrganizationUserAssignment::create([
                'firm_id' => $firm->id,
                'user_id' => $firstAccountant->id,
                'organization_role_id' => $leadAccRole->id,
            ]);

            $this->line("Assigned: firm #{$firm->id} ({$firm->firm_name})");
        }

        $this->line('');
        if ($dryRun) {
            $this->info(count($firmsMissingLeadAccountant) . ' firm(s) would be assigned. Re-run without --dry-run to apply.');
        } else {
            $this->info('Done. Assigned Lead Accountant on ' . count($firmsMissingLeadAccountant) . ' firm(s).');
        }

        return self::SUCCESS;
    }
}

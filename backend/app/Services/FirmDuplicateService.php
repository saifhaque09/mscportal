<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use App\Modules\Clients\Models\Firm;

class FirmDuplicateService
{
    /**
     * Tables that reference firms.id, and the column they reference it by.
     * Tables with a unique constraint that includes the firm column are listed
     * in UNIQUE_CONSTRAINED_TABLES so merge() knows to dedupe instead of blindly reassigning.
     */
    private const RELATED_TABLES = [
        'checklist_items'               => 'firm_id',
        'invites'                       => 'firm_id',
        'firm_agreements'                => 'firm_id',
        'users'                          => 'firm_id',
        'organization_user_assignments' => 'firm_id',
        'organization_deadlines'        => 'organization_id',
        'profit_loss_reports'           => 'organization_id',
        'balance_sheet_reports'         => 'organization_id',
        'firm_sub_tax_category_codes'   => 'firm_id',
    ];

    /**
     * Tables whose unique constraint would be violated by a blind reassignment,
     * mapped to the extra columns (besides the firm column) that make up that constraint.
     */
    private const UNIQUE_CONSTRAINED_TABLES = [
        'organization_deadlines'        => ['deadline_id'],
        'organization_user_assignments' => ['user_id', 'organization_role_id'],
        'firm_sub_tax_category_codes'   => ['sub_tax_category_id', 'code', 'value'],
    ];

    /** Groups of firms sharing the same firm_name + contact_email. */
    public function findDuplicateGroups(): Collection
    {
        return Firm::whereNull('deleted_at')
            ->selectRaw('firm_name, contact_email, COUNT(*) as cnt')
            ->groupBy('firm_name', 'contact_email')
            ->having('cnt', '>', 1)
            ->get()
            ->map(fn ($group) => [
                'firm_name'     => $group->firm_name,
                'contact_email' => $group->contact_email,
                'firms'         => Firm::where('firm_name', $group->firm_name)
                    ->where('contact_email', $group->contact_email)
                    ->whereNull('deleted_at')
                    ->orderBy('id')
                    ->get(['id', 'guid', 'firm_name', 'contact_email', 'created_at'])
                    ->map(fn ($firm) => [
                        'id'         => $firm->id,
                        'guid'       => $firm->guid,
                        'created_at' => $firm->created_at?->toDateString(),
                        'related'    => $this->attachedCounts($firm->id),
                        'is_empty'   => $this->isEmpty($firm->id),
                    ]),
            ]);
    }

    /** Count of related records per table for a given firm id. */
    public function attachedCounts(int $firmId): array
    {
        return collect(self::RELATED_TABLES)
            ->map(fn ($column, $table) => DB::table($table)->where($column, $firmId)->count())
            ->filter(fn ($count) => $count > 0)
            ->all();
    }

    public function isEmpty(int $firmId): bool
    {
        foreach (self::RELATED_TABLES as $table => $column) {
            if (DB::table($table)->where($column, $firmId)->exists()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Soft-delete every duplicate firm that has zero related records anywhere.
     * Returns the ids that were deleted.
     */
    public function deleteEmptyDuplicates(): array
    {
        $deleted = [];

        foreach ($this->findDuplicateGroups() as $group) {
            foreach ($group['firms'] as $firm) {
                if ($firm['is_empty']) {
                    Firm::find($firm['id'])?->delete();
                    $deleted[] = $firm['id'];
                }
            }
        }

        return $deleted;
    }

    /**
     * Move every related record from $duplicateIds onto $canonicalId, then soft-delete the duplicates.
     * For tables with a unique constraint on (firm column + other columns), a row that would collide
     * with one the canonical firm already has is left on the duplicate (and thus removed with it)
     * rather than reassigned, so no data is silently overwritten.
     *
     * @return array{moved: array<string,int>, skipped: array<string,int>, deleted: int[]}
     */
    public function merge(int $canonicalId, array $duplicateIds): array
    {
        $duplicateIds = array_values(array_diff($duplicateIds, [$canonicalId]));
        $moved        = [];
        $skipped      = [];

        DB::transaction(function () use ($canonicalId, $duplicateIds, &$moved, &$skipped) {
            foreach (self::RELATED_TABLES as $table => $column) {
                $moved[$table]   = 0;
                $skipped[$table] = 0;

                foreach ($duplicateIds as $duplicateId) {
                    $uniqueColumns = self::UNIQUE_CONSTRAINED_TABLES[$table] ?? null;

                    if (! $uniqueColumns) {
                        $moved[$table] += DB::table($table)
                            ->where($column, $duplicateId)
                            ->update([$column => $canonicalId]);
                        continue;
                    }

                    // Row-by-row so we can detect a would-be unique-constraint collision.
                    $rows = DB::table($table)->where($column, $duplicateId)->get();

                    foreach ($rows as $row) {
                        $conflict = DB::table($table)
                            ->where($column, $canonicalId)
                            ->where(function ($q) use ($uniqueColumns, $row) {
                                foreach ($uniqueColumns as $uc) {
                                    $q->where($uc, $row->{$uc});
                                }
                            })
                            ->exists();

                        if ($conflict) {
                            $skipped[$table]++;
                            continue;
                        }

                        DB::table($table)->where('id', $row->id)->update([$column => $canonicalId]);
                        $moved[$table]++;
                    }
                }
            }

            Firm::whereIn('id', $duplicateIds)->delete(); // soft delete — reversible
        });

        return ['moved' => $moved, 'skipped' => $skipped, 'deleted' => $duplicateIds];
    }
}

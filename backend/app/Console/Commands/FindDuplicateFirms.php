<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FirmDuplicateService;

class FindDuplicateFirms extends Command
{
    protected $signature   = 'firms:find-duplicates {--delete-empty : Soft-delete duplicate firms that have zero related records anywhere}';
    protected $description = 'Report firms sharing the same firm_name + contact_email, and what each one has attached to it';

    public function handle(FirmDuplicateService $service): int
    {
        $groups = $service->findDuplicateGroups();

        if ($groups->isEmpty()) {
            $this->info('No duplicate firms found.');
            return self::SUCCESS;
        }

        foreach ($groups as $group) {
            $this->line('');
            $this->line("=== \"{$group['firm_name']}\" <{$group['contact_email']}> — {$group['firms']->count()} records ===");

            foreach ($group['firms'] as $firm) {
                $summary = collect($firm['related'])
                    ->map(fn ($count, $table) => "{$table}={$count}")
                    ->implode(', ');

                $this->line(sprintf(
                    '  id=%d guid=%s created_at=%s %s',
                    $firm['id'],
                    $firm['guid'],
                    $firm['created_at'],
                    $firm['is_empty'] ? '[EMPTY — no related records]' : "[HAS DATA: {$summary}]"
                ));
            }
        }

        if ($this->option('delete-empty')) {
            $deleted = $service->deleteEmptyDuplicates();
            $this->line('');
            $this->info('Done. Soft-deleted ' . count($deleted) . ' empty duplicate firm(s): ' . implode(', ', $deleted));
        } else {
            $this->line('');
            $this->info('Dry run only — no records were changed. Re-run with --delete-empty to soft-delete duplicates marked [EMPTY].');
            $this->info('Firms marked [HAS DATA] need manual review — use the merge endpoint/service with an explicit canonical id.');
        }

        return self::SUCCESS;
    }
}

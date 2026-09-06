<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FirmDuplicateService;
use App\Modules\Clients\Models\Firm;

class MergeDuplicateFirms extends Command
{
    protected $signature   = 'firms:merge-duplicates {--canonical= : Firm id to keep} {--duplicates= : Comma-separated firm ids to merge into the canonical one and remove}';
    protected $description = 'Move all related records (deadlines, users, checklist items, etc.) from duplicate firm ids onto a canonical firm id, then soft-delete the duplicates';

    public function handle(FirmDuplicateService $service): int
    {
        $canonicalId = (int) $this->option('canonical');
        $duplicateIds = array_filter(array_map('intval', explode(',', (string) $this->option('duplicates'))));

        if (! $canonicalId || empty($duplicateIds)) {
            $this->error('Usage: php artisan firms:merge-duplicates --canonical=15 --duplicates=16,22');
            return self::FAILURE;
        }

        $canonical = Firm::find($canonicalId);
        if (! $canonical) {
            $this->error("Canonical firm id={$canonicalId} not found.");
            return self::FAILURE;
        }

        $duplicates = Firm::whereIn('id', $duplicateIds)->get();
        if ($duplicates->count() !== count($duplicateIds)) {
            $this->error('One or more duplicate ids not found: ' . implode(',', $duplicateIds));
            return self::FAILURE;
        }

        $this->line("Canonical: id={$canonical->id} guid={$canonical->guid} \"{$canonical->firm_name}\" <{$canonical->contact_email}>");
        foreach ($duplicates as $d) {
            $this->line("  will merge & remove: id={$d->id} guid={$d->guid} \"{$d->firm_name}\" <{$d->contact_email}>");
        }

        if (! $this->confirm('Proceed with this merge? This soft-deletes the duplicate firm(s) above.')) {
            $this->info('Aborted — no changes made.');
            return self::SUCCESS;
        }

        $result = $service->merge($canonicalId, $duplicateIds);

        $this->line('');
        $this->info('Moved: ' . collect($result['moved'])->filter()->map(fn ($c, $t) => "{$t}={$c}")->implode(', ') ?: '(nothing needed moving)');
        $this->info('Skipped (already existed on canonical): ' . collect($result['skipped'])->filter()->map(fn ($c, $t) => "{$t}={$c}")->implode(', ') ?: '(none)');
        $this->info('Soft-deleted firm ids: ' . implode(', ', $result['deleted']));

        return self::SUCCESS;
    }
}

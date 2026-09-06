<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Clients\Models\Firm;
use App\Services\OrganizationDeadlineService;

class GenerateOrganizationDeadlines extends Command
{
    protected $signature   = 'deadlines:generate {--firm= : Generate for a specific firm ID only}';
    protected $description = 'Generate or refresh organization deadlines for all firms';

    public function handle(OrganizationDeadlineService $service): void
    {
        $firmId = $this->option('firm');

        $query = Firm::whereNull('deleted_at')->orderBy('id');

        if ($firmId) {
            $query->where('id', $firmId);
        }

        $total = 0;

        $query->chunk(100, function ($firms) use ($service, &$total) {
            foreach ($firms as $firm) {
                $count = $service->generate($firm);
                $total += $count;
                $this->line("  [{$firm->id}] {$firm->firm_name} — {$count} deadline(s)");
            }
        });

        $this->info("Done. Total deadlines upserted: {$total}");
    }
}

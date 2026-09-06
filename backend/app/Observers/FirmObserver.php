<?php

namespace App\Observers;

use App\Modules\Clients\Models\Firm;
use App\Services\OrganizationDeadlineService;

class FirmObserver
{
    public function __construct(private OrganizationDeadlineService $service) {}

    public function created(Firm $firm): void
    {
        $this->service->generate($firm);
    }

    public function updated(Firm $firm): void
    {
        // Only regenerate if deadline-relevant fields changed
        $watched = [
            'tax_return', 'payment_type', 'hst_number', 'gst_number', 'meta',
            'weekly_day', 'weekly_month', 'financial_year_end', 'gst_hst_date',
        ];

        if ($firm->wasChanged($watched)) {
            $this->service->generate($firm);
        }
    }
}

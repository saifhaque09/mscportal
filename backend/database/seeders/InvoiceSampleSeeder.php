<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Invoices\Models\Invoice;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoiceSampleSeeder extends Seeder
{
    public function run(): void
    {
        $firms = Firm::query()->orderBy('id')->take(2)->get();
        $creator = User::query()->orderBy('id')->first();
        if ($firms->count() < 2 || ! $creator) {
            $this->command->warn('At least two firms and one user are required for invoice samples.');
            return;
        }

        $samples = [
            [$firms[0], 'Monthly accounting services', 1850, now()->addDays(7)],
            [$firms[1], 'Payroll preparation and filing', 3200, now()->addDays(14)],
        ];

        foreach ($samples as [$firm, $description, $subtotal, $dueAt]) {
            $number = 'SAMPLE-INV-'.$firm->id;
            if (Invoice::where('number', $number)->exists()) continue;
            $hst = round($subtotal * .13, 2);
            DB::transaction(function () use ($firm, $creator, $number, $description, $subtotal, $hst, $dueAt) {
                $invoice = Invoice::create([
                    'firm_id' => $firm->id,
                    'created_by' => $creator->id,
                    'number' => $number,
                    'issued_at' => now()->toDateString(),
                    'due_at' => $dueAt->toDateString(),
                    'subtotal' => $subtotal,
                    'hst_rate' => 13,
                    'hst_amount' => $hst,
                    'total' => $subtotal + $hst,
                    'status' => 'issued',
                ]);
                $invoice->items()->create(['description' => $description, 'amount' => $subtotal]);
            });
        }
    }
}

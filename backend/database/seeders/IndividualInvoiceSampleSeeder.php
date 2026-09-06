<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Invoices\Models\IndividualInvoice;
use App\Modules\Payments\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndividualInvoiceSampleSeeder extends Seeder
{
    public function run(): void
    {
        $clients = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['Taxfiler', 'Client']))->orderBy('id')->take(2)->get();
        $staff = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['Admin', 'Accountant']))->orderBy('id')->first();
        if ($clients->isEmpty() || ! $staff) {
            $this->command->warn('Individual invoice samples skipped: tax-filer and staff users are required.');
            return;
        }
        if ($clients->count() === 1) $clients = $clients->concat([$clients->first()]);

        foreach ($clients as $index => $client) {
            $year = 2025 - $index;
            $number = 'SAMPLE-T4-'.$year.'-'.$client->id;
            if (IndividualInvoice::where('number', $number)->exists()) continue;
            $subtotal = $index === 0 ? 275 : 325;
            $hst = round($subtotal * .13, 2);
            DB::transaction(function () use ($client, $staff, $year, $number, $subtotal, $hst, $index) {
                $invoice = IndividualInvoice::create([
                    'client_id' => $client->id, 'created_by' => $staff->id, 'number' => $number,
                    'tax_year' => $year, 'service_type' => 'T4 processing',
                    'description' => 'T4 preparation and filing for '.$year,
                    'subtotal' => $subtotal, 'hst_rate' => 13, 'hst_amount' => $hst,
                    'total' => $subtotal + $hst, 'issued_at' => $year.'-02-01', 'due_at' => $year.'-02-15',
                    'status' => $index === 0 ? 'paid' : 'issued',
                    'paid_at' => $index === 0 ? $year.'-02-08 10:30:00' : null,
                    'payment_method' => $index === 0 ? 'e_transfer' : null,
                    'transaction_id' => $index === 0 ? 'DEMO-ETR-'.$year : null,
                ]);
                if ($index === 0) Payment::create([
                    'firm_id' => null, 'year' => $year, 'admin_id' => $staff->id, 'client_id' => $client->id,
                    'amount' => $invoice->total, 'payment_method' => 'e_payment', 'transaction_id' => 'DEMO-ETR-'.$year,
                    'status' => 'paid', 'payment_date' => $year.'-02-08', 'remarks' => 'Sample E-Transfer for '.$number,
                ]);
            });
        }
    }
}

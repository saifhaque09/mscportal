<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Individual\Models\SubTaxCategory;

class SubTaxCategorySeeder extends Seeder
{
    public function run(): void
    {
        $data = [

            // All
            [
                'code' => 'T4',
                'name' => 'Employment Income',
                'description' => 'Employment income (from employer)',
                'taxpayer_type' => 'ALL',
            ],
            [
                'code' => 'RC62',
                'name' => 'Child Benefits',
                'description' => 'Universal Child Care Benefit / COVID-19-related benefits',
                'taxpayer_type' => 'ALL',
                'aliases' => json_encode(['RC210']),
            ],
            [
                'code' => 'T5018',
                'name' => 'Contract Income',
                'description' => 'Statement of contract payments (construction industry)',
                'taxpayer_type' => 'ALL',
            ],

            // Investments
            [
                'code' => 'T5',
                'name' => 'Investment Income',
                'description' => 'Investment income (interest, dividends)',
                'taxpayer_type' => 'INV',
            ],
            [
                'code' => 'T3',
                'name' => 'Trust Income',
                'description' => 'Trust income (mutual funds, estates)',
                'taxpayer_type' => 'INV',
            ],

            // EI / RRSP
            [
                'code' => 'T5007',
                'name' => 'Social Assistance',
                'description' => 'Social assistance or workers’ compensation benefits',
                'taxpayer_type' => 'EIRRSP',
            ],
            [
                'code' => 'T4E',
                'name' => 'Employment Insurance',
                'description' => 'Employment Insurance (EI) benefits',
                'taxpayer_type' => 'EIRRSP',
            ],
            [
                'code' => 'T4RSP',
                'name' => 'RRSP/RRIF Withdrawals',
                'description' => 'RRSP or RRIF withdrawals',
                'taxpayer_type' => 'EIRRSP',
                'aliases' => json_encode(['T4RIF']),
            ],

            // Seniors
            [
                'code' => 'T4A',
                'name' => 'Pension or Other Income',
                'description' => 'Pension, annuity, or other income',
                'taxpayer_type' => 'SEN',
            ],
            [
                'code' => 'T4A(OAS)',
                'name' => 'Old Age Security',
                'description' => 'Old Age Security income',
                'taxpayer_type' => 'SEN',
            ],
            [
                'code' => 'T4A(P)',
                'name' => 'CPP Benefits',
                'description' => 'Canada Pension Plan (CPP) benefits',
                'taxpayer_type' => 'SEN',
            ],

            // Students
            [
                'code' => 'T2202',
                'name' => 'Tuition Certificate',
                'description' => 'Tuition and education amount certificate',
                'taxpayer_type' => 'STU',
                'aliases' => json_encode(['T2202A']),
            ],

            // Quebec
            [
                'code' => 'RL-1',
                'name' => 'Relevé Forms',
                'description' => 'Relevé 1 / 2 (Quebec only)',
                'taxpayer_type' => 'QUE',
                'aliases' => json_encode(['RL-2']),
            ],
        ];

        foreach ($data as $item) {
            SubTaxCategory::updateOrCreate(
                ['code' => $item['code']],
                $item
            );
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Individual\Models\TaxCategory;

class TaxCategorySeeder extends Seeder
{
    public function run()
    {
        $categories = [
            ['name' => 'Resident', 'code' => 'RES', 'description' => 'Lives in Canada most of the year and files a full Canadian tax return.'],
            ['name' => 'Non-Resident', 'code' => 'NONRES', 'description' => 'Lives outside Canada; files only on Canadian income.'],
            ['name' => 'Newcomer', 'code' => 'NEW', 'description' => 'Recently moved to Canada; first-year residency rules apply.'],
            ['name' => 'Student', 'code' => 'STU', 'description' => 'Canadian or international student; may claim tuition and education amounts.'],
            ['name' => 'Self-Employed', 'code' => 'SE', 'description' => 'Works for self; must report business income and expenses.'],
            ['name' => 'Senior', 'code' => 'SEN', 'description' => 'Age 65+; may claim pension income and age credit.'],
            ['name' => 'Deceased Taxpayer', 'code' => 'DEC', 'description' => 'Final return handled by legal representative or executor.'],
            ['name' => 'Indigenous Person', 'code' => 'IND', 'description' => 'May have tax-exempt income under specific conditions (e.g., work on reserve).'],
            ['name' => 'Investor', 'code' => 'INV', 'description' => 'Earns investment income such as dividends, interest, or capital gains.'],
            ['name' => 'Part-Year Resident', 'code' => 'PYR', 'description' => 'Lived in Canada for part of the year; partial residency rules apply.'],
            ['name' => 'Quebec', 'code' => 'QUE', 'description' => 'For Quebec residents (provincial equivalents).'],
            ['name' => 'Tradesperson and Professional', 'code' => 'TRA', 'description' => 'For tradespersons.'],
            ['name' => 'Northern resident', 'code' => 'NORTH', 'description' => 'Northern Residents Deductions.'],
            ['name' => 'EI/RRSP Withdrawal', 'code' => 'EIRRSP', 'description' => null],
            ['name' => 'Profession or Union', 'code' => 'PU', 'description' => null],
        ];

        foreach ($categories as $cat) {
            TaxCategory::updateOrCreate(
                ['code' => $cat['code']],
                [
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'status' => 'active'
                ]
            );
        }
    }
}
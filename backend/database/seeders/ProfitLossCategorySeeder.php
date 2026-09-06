<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Reports\Models\ProfitLossCategory;

class ProfitLossCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // Generic totals
            ['name' => 'Gross Profit', 'type' => 'total'],
            ['name' => 'Net Profit',   'type' => 'total'],

            // Net Income Till Date chart — type must be 'income'
            ['name' => 'Operating Revenues',     'type' => 'income'],
            ['name' => 'Non-Operating Revenues', 'type' => 'income'],
            ['name' => 'Other Adjustments',      'type' => 'income'],
            ['name' => 'Cost of Good Sold',      'type' => 'income'],

            // Expenses By Category chart — type must be 'expense'
            ['name' => 'Fix Expenses',      'type' => 'expense'],
            ['name' => 'Variable Expenses', 'type' => 'expense'],
            ['name' => 'Other Expenses',    'type' => 'expense'],
        ];

        foreach ($categories as $category) {
            ProfitLossCategory::updateOrCreate(
                ['name' => $category['name']],
                ['type' => $category['type']]
            );
        }
    }
}

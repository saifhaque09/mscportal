<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Reports\Models\BalanceSheetCategory;

class BalanceSheetCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // Asset categories
            ['name' => 'Assets',      'type' => 'asset'],
            ['name' => 'Liabilities', 'type' => 'liability'],
            ['name' => 'Equity',      'type' => 'equity'],
        ];

        foreach ($categories as $category) {
            BalanceSheetCategory::updateOrCreate(
                ['name' => $category['name'], 'type' => $category['type']],
                $category
            );
        }
    }
}

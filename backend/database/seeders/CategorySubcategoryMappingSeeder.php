<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Individual\Models\TaxCategory;
use App\Modules\Individual\Models\SubTaxCategory;

class CategorySubcategoryMappingSeeder extends Seeder
{
    public function run(): void
    {
        // ✅ Fetch categories (FIXED CODES)
        $student  = TaxCategory::where('code', 'STU')->first();
        $senior   = TaxCategory::where('code', 'SEN')->first();
        $resident = TaxCategory::where('code', 'RES')->first();

        // ✅ Fetch forms
        $t4     = SubTaxCategory::where('code', 'T4')->first();
        $rc62   = SubTaxCategory::where('code', 'RC62')->first();
        $t5018  = SubTaxCategory::where('code', 'T5018')->first();
        $t5     = SubTaxCategory::where('code', 'T5')->first();
        $t3     = SubTaxCategory::where('code', 'T3')->first();
        $t5007  = SubTaxCategory::where('code', 'T5007')->first();
        $t4e    = SubTaxCategory::where('code', 'T4E')->first();
        $t4rsp  = SubTaxCategory::where('code', 'T4RSP')->first();
        $t4a    = SubTaxCategory::where('code', 'T4A')->first();
        $oas    = SubTaxCategory::where('code', 'T4A(OAS)')->first();
        $cpp    = SubTaxCategory::where('code', 'T4A(P)')->first();
        $t2202  = SubTaxCategory::where('code', 'T2202')->first();

        // =========================
        // 🎓 STUDENT
        // =========================
        if ($student) {
            $ids = array_filter([
                $t4?->id,
                $rc62?->id,
                $t5018?->id,
                $t5?->id,
                $t3?->id,
                $t5007?->id,
                $t4e?->id,
                $t4rsp?->id,
                $t2202?->id,
            ]);

            $student->subTaxCategories()->syncWithoutDetaching($ids);
        }

        // =========================
        // 👴 SENIOR
        // =========================
        if ($senior) {
            $ids = array_filter([
                $t4?->id,
                $t5?->id,
                $t3?->id,
                $t5007?->id,
                $t4e?->id,
                $t4rsp?->id,
                $t4a?->id,
                $oas?->id,
                $cpp?->id,
            ]);

            $senior->subTaxCategories()->syncWithoutDetaching($ids);
        }

        // =========================
        // 🧾 RESIDENT (GENERAL)
        // =========================
        if ($resident) {
            $ids = array_filter([
                $t4?->id,
                $rc62?->id,
                $t5018?->id,
                $t5?->id,
                $t3?->id,
                $t5007?->id,
                $t4e?->id,
                $t4rsp?->id,
                $t4a?->id,
            ]);

            $resident->subTaxCategories()->syncWithoutDetaching($ids);
        }
    }
}
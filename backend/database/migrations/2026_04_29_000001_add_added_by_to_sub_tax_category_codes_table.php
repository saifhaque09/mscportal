<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if (! Schema::hasColumn('sub_tax_category_codes', 'added_by')) {
                $table->foreignId('added_by')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if (Schema::hasColumn('sub_tax_category_codes', 'added_by')) {
                $table->dropConstrainedForeignId('added_by');
            }
        });
    }
};

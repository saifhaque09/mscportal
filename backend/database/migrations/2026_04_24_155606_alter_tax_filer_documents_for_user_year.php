<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            // Add as nullable first so existing rows can be backfilled safely.
            if (! Schema::hasColumn('tax_filer_documents', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            }

            if (! Schema::hasColumn('tax_filer_documents', 'year')) {
                $table->year('year')->nullable()->after('user_id');
            }
        });

        // Backfill from the existing user_tax_categories relation.
        DB::statement('
            UPDATE tax_filer_documents tfd
            INNER JOIN user_tax_categories utc
                ON utc.id = tfd.user_tax_category_id
            SET
                tfd.user_id = utc.user_id,
                tfd.year = utc.year
            WHERE tfd.user_tax_category_id IS NOT NULL
        ');

        $missingMappings = DB::table('tax_filer_documents')
            ->whereNull('user_id')
            ->orWhereNull('year')
            ->count();

        if ($missingMappings > 0) {
            throw new RuntimeException(
                'tax_filer_documents contains rows that cannot be mapped to user_id/year from user_tax_category_id.'
            );
        }

        Schema::table('tax_filer_documents', function (Blueprint $table) {
            if (! $this->hasForeignKey('tax_filer_documents', 'tax_filer_documents_user_id_foreign')) {
                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            }

            if ($this->hasForeignKey('tax_filer_documents', 'tax_filer_documents_user_tax_category_id_foreign')) {
                $table->dropForeign(['user_tax_category_id']);
            }

            if (Schema::hasColumn('tax_filer_documents', 'user_tax_category_id')) {
                $table->dropColumn('user_tax_category_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('tax_filer_documents', 'user_tax_category_id')) {
                $table->foreignId('user_tax_category_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('user_tax_categories')
                    ->nullOnDelete();
            }
        });

        DB::statement('
            UPDATE tax_filer_documents tfd
            INNER JOIN user_tax_categories utc
                ON utc.user_id = tfd.user_id
               AND utc.year = tfd.year
            SET tfd.user_tax_category_id = utc.id
            WHERE tfd.user_id IS NOT NULL
              AND tfd.year IS NOT NULL
        ');

        Schema::table('tax_filer_documents', function (Blueprint $table) {
            if ($this->hasForeignKey('tax_filer_documents', 'tax_filer_documents_user_id_foreign')) {
                $table->dropForeign(['user_id']);
            }

            $columnsToDrop = array_values(array_filter([
                Schema::hasColumn('tax_filer_documents', 'user_id') ? 'user_id' : null,
                Schema::hasColumn('tax_filer_documents', 'year') ? 'year' : null,
            ]));

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    private function hasForeignKey(string $table, string $constraint): bool
    {
        return DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('CONSTRAINT_NAME', $constraint)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('INDEX_NAME', $indexName)
            ->exists();
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        DB::statement("
            ALTER TABLE filing_documents
            MODIFY COLUMN `document_type`
            ENUM('generated', 'signed', 'cra_filed')
            NOT NULL
        ");
    }

    public function down()
    {
        DB::statement("
            ALTER TABLE filing_documents
            MODIFY COLUMN `document_type`
            ENUM('generated', 'signed')
            NOT NULL
        ");
    }
};

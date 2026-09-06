<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up()
    {
        DB::statement("
            ALTER TABLE files 
            MODIFY COLUMN `group` 
            ENUM('document','profile_image','logo','favicon','agreement','tax_filer') 
            NOT NULL
        ");
    }

    public function down()
    {
        DB::statement("
            ALTER TABLE files 
            MODIFY COLUMN `group` 
            ENUM('document','profile_image','logo','favicon','agreement') 
            NOT NULL
        ");
    }
};

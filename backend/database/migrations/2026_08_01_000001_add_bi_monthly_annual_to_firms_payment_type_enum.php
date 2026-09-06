<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up()
    {
        DB::statement("
            ALTER TABLE firms
            MODIFY COLUMN `payment_type`
            ENUM('Monthly','Semi-Monthly','Bi-Weekly','Weekly','Bi-Monthly','Annual')
            NULL
        ");
    }

    public function down()
    {
        DB::statement("
            ALTER TABLE firms
            MODIFY COLUMN `payment_type`
            ENUM('Monthly','Semi-Monthly','Bi-Weekly','Weekly')
            NULL
        ");
    }
};

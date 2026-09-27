<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_deadlines', function (Blueprint $table) {
            if (! Schema::hasColumn('organization_deadlines', 'payment_status')) {
                $table->string('payment_status', 20)->default('Pending')->after('status');
            }
            if (! Schema::hasColumn('organization_deadlines', 'payment_date')) {
                $table->date('payment_date')->nullable()->after('payment_status');
            }
        });

        if (! DB::table('email_templates')->where('slug', 'payment_reminder')->exists()) {
            DB::table('email_templates')->insert([
                'name' => 'Payment Reminder',
                'slug' => 'payment_reminder',
                'subject' => 'Payment reminder: {{$deadline_name}}',
                'body' => '<p>Hello {{$firm_name}},</p><p>This is a reminder that {{$deadline_name}} is due on {{$due_date}}.</p><p>Please contact your accountant if you have already made this payment.</p>',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('organization_deadlines', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'payment_date']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    /**
     * Run the migrations.
     */
	public function up()
	{
		Schema::create('firms', function (Blueprint $table) {
			$table->id();
			$table->string('guid');
			$table->string('firm_name');
			$table->string('country_code', 64)->nullable();
			$table->string('country_name', 100)->nullable();
			$table->string('province', 100)->nullable();
			$table->string('city', 100)->nullable();
			$table->string('postal', 10)->nullable();
			$table->string('gst_number', 100)->nullable();
			$table->string('hst_number', 100)->nullable();
			$table->string('pst_number', 100)->nullable();
			$table->string('contact_email', 100)->nullable();
			$table->string('contact_mobile', 100)->nullable();
			$table->text('business_account_details')->nullable();
			$table->text('address')->nullable();
			$table->text('meta')->nullable();
			$table->text('agreements')->nullable();
			$table->text('tax_return')->nullable();
			$table->text('business_categories')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
			$table->timestamps();
		});

        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->nullable()->constrained('firms')->cascadeOnDelete();
            $table->string('code', 64)->nullable();
            $table->string('name');
            $table->boolean('is_required')->default(true);
            $table->string('category')->nullable();
            $table->string('details')->nullable();
            $table->integer('year')->nullable();
            $table->integer('month')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_id')->nullable()->constrained('checklist_items')->nullOnDelete();
            $table->foreignId('file_id')->constrained('files')->cascadeOnDelete();
            $table->enum('status',['pending','approved','reupload'])->default('pending');
            $table->text('comments')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->nullable()->constrained('firms')->nullOnDelete();
            $table->string('email', 200)->unique();
            $table->string('mobile', 100)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('role', 100);
            $table->string('hash', 200);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('send_to', 200);
            $table->string('otp', 100);
            $table->text('hash');
            $table->string('type', 100)->nullable();
            $table->string('mode', 100)->nullable();
            $table->timestamp('valid_till')->nullable();
            $table->timestamps();
        });

        Schema::create('firm_agreements', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('firm_id')->unsigned();
            $table->bigInteger('file_id')->unsigned();
            //$table->unique(['firm_id', 'file_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('firm_id')->nullable()->constrained('firms')->nullOnDelete();
        });    

	}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
		$tabel->dropIfExists('firms');
		$tabel->dropIfExists('firms_checklist_items');
		$tabel->dropIfExists('documents');
    }
};

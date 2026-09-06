<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { if (!Schema::hasTable('invoices')) { Schema::create('invoices', function(Blueprint $t){$t->id();$t->foreignId('firm_id')->constrained('firms');$t->foreignId('created_by')->constrained('users');$t->string('number',64);$t->date('issued_at');$t->date('due_at');$t->decimal('subtotal',12,2);$t->decimal('hst_rate',5,2)->default(13);$t->decimal('hst_amount',12,2);$t->decimal('total',12,2);$t->enum('status',['draft','issued','paid','overdue'])->default('issued');$t->timestamp('paid_at')->nullable();$t->timestamps();$t->index(['firm_id','status']);}); } if (!Schema::hasTable('invoice_items')) { Schema::create('invoice_items',function(Blueprint $t){$t->id();$t->foreignId('invoice_id')->constrained()->cascadeOnDelete();$t->string('description');$t->decimal('amount',12,2);$t->timestamps();}); } }
 public function down(): void { Schema::dropIfExists('invoice_items'); Schema::dropIfExists('invoices'); }
};

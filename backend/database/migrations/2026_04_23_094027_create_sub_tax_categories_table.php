<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_tax_categories', function (Blueprint $table) {
            $table->id();

            $table->string('code'); // T4, RC62, T4RSP
            $table->string('name'); // Employment Income
            $table->text('description')->nullable();

            // NEW (important for your case)
            $table->string('taxpayer_type')->nullable(); 
            // ALL, INV, EIRRSP, SEN, STU, QUE

            $table->json('aliases')->nullable(); 
            // for cases like RC62/RC210 or T4RSP/T4RIF

            $table->enum('status', ['active','inactive'])->default('active');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_tax_categories');
    }
};
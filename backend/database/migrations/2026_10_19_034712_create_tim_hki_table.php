<?php

// database/migrations/2026_10_19_130000_create_tim_hki_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tim_hki', function (Blueprint $table) {
            $table->id();
            $table->string('jabatan');                 // contoh: Ketua Sentra HKI
            $table->string('nama');
            $table->string('foto', 500)->nullable();   // path di disk "public"
            $table->unsignedInteger('urutan')->default(1);
            $table->timestamps();

            $table->index('urutan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tim_hki');
    }
};
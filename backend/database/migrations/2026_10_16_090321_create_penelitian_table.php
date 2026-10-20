<?php

// database/migrations/2026_10_16_100000_create_penelitian_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penelitian', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 500);
            $table->string('ketua');
            $table->string('bidang')->nullable();
            $table->string('kelompok', 20)->nullable();   // Internal / Eksternal
            $table->string('program', 150);
            $table->unsignedSmallInteger('tahun');
            $table->text('abstrak')->nullable();
            $table->json('anggota')->nullable();          // ["Nama 1", "Nama 2"]
            $table->json('kata_kunci')->nullable();       // ["Filament", "3D Printing"]
            $table->string('gambar', 500)->nullable();    // path di disk "public"
            $table->timestamps();

            $table->index('kelompok');
            $table->index('program');
            $table->index('tahun');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penelitian');
    }
};
<?php

// database/migrations/2026_10_18_100000_create_pengabdian_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengabdian', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 500);
            $table->string('ketua');
            $table->string('mitra')->nullable();
            $table->string('bidang')->nullable();
            $table->string('kelompok', 20)->nullable();   // Internal / Eksternal
            $table->string('program', 150);
            $table->unsignedSmallInteger('tahun');
            $table->text('abstrak')->nullable();
            $table->json('anggota')->nullable();          // ["Nama 1", "Nama 2"]
            $table->json('kata_kunci')->nullable();       // ["Pendampingan", "Pelatihan"]
            $table->string('gambar', 500)->nullable();    // path di disk "public"
            $table->timestamps();

            $table->index('kelompok');
            $table->index('program');
            $table->index('tahun');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengabdian');
    }
};
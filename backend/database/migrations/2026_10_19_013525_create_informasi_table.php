<?php

// database/migrations/2026_10_19_110000_create_informasi_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('informasi', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 500);
            $table->string('kategori', 30);              // Informasi, Kegiatan, Penelitian, Pengabdian, Panduan
            $table->date('tanggal');
            $table->string('penulis')->nullable();       // kosong = "P3M" di halaman publik
            $table->json('isi')->nullable();             // blok: paragraf, daftar poin, tabel
            $table->json('lampiran')->nullable();        // [{label, url|path}]
            $table->string('gambar', 500)->nullable();   // path di disk "public"
            $table->timestamps();

            $table->index('kategori');
            $table->index('tanggal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informasi');
    }
};
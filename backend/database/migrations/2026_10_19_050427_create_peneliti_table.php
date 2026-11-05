<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peneliti', function (Blueprint $table) {
            $table->id();

            // Yang ditampilkan di halaman publik: foto, nama, prodi, tautan SINTA
            $table->string('nama');
            $table->string('prodi', 150);
            $table->string('foto', 500)->nullable();
            $table->json('tautan')->nullable();     // [{label, url}] (tautan SINTA)

            // Tidak lagi diisi dari form admin, jadi boleh kosong
            $table->string('jabatan', 100)->nullable();
            $table->string('jurusan', 150)->nullable();
            $table->string('laboratorium')->nullable();
            $table->string('nidn', 30)->nullable();
            $table->string('email')->nullable();
            $table->text('tentang')->nullable();

            // Daftar dinamis disimpan sebagai JSON (data lama, tidak ditampilkan)
            $table->json('keahlian')->nullable();   // ["Machine Learning", ...]
            $table->json('pendidikan')->nullable(); // [{jenjang, bidang, institusi, tahun}]
            $table->json('luaran')->nullable();     // [{judul, penulis, penerbit, tahun, jenis}]

            $table->timestamps();

            $table->index('nama');
            $table->index('jurusan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peneliti');
    }
};
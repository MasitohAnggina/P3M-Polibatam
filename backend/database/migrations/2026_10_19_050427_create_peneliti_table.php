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
            $table->string('nama');
            $table->string('jabatan', 100);
            $table->string('nidn', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('jurusan', 150);
            $table->string('prodi', 150);
            $table->string('laboratorium')->nullable();
            $table->string('foto', 500)->nullable();
            $table->text('tentang')->nullable();

            // Daftar dinamis disimpan sebagai JSON
            $table->json('keahlian')->nullable();   // ["Machine Learning", ...]
            $table->json('pendidikan')->nullable(); // [{jenjang, bidang, institusi, tahun}]
            $table->json('luaran')->nullable();     // [{judul, penulis, penerbit, tahun, jenis}]
            $table->json('tautan')->nullable();     // [{label, url}]

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
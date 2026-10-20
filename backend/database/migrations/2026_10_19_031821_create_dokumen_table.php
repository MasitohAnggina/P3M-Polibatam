<?php

// database/migrations/2026_10_19_120000_create_dokumen_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dokumen', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 500);
            $table->string('kategori', 30);              // Panduan, Template, Formulir, SK & Surat Edaran
            $table->string('tahun', 4);
            $table->date('tanggal')->nullable();         // kosong = kartu publik hanya menampilkan tahun
            $table->text('keterangan')->nullable();      // ikut dicari di kolom pencarian publik
            $table->string('format', 10)->nullable();    // PDF, DOCX, XLSX, PPTX, ZIP
            $table->string('ukuran', 30)->nullable();    // contoh: "2,4 MB"
            $table->string('link_file', 1000);           // URL, path di folder public, atau "#" bila belum ada
            $table->timestamps();

            $table->index('kategori');
            $table->index('tahun');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen');
    }
};
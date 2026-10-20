<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hki', function (Blueprint $table) {
            $table->id();
            $table->string('jenis', 100);
            $table->string('kategori')->nullable();
            $table->string('judul', 500);
            $table->json('inventor');
            $table->string('nomor_permohonan', 100)->unique();
            $table->unsignedSmallInteger('tahun')->index();
            $table->string('gambar')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hki');
    }
};
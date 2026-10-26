<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terjemahan_infografis', function (Blueprint $table) {
            $table->id();
            /* prodi | jurusan | program_penelitian | jenis_pengabdian */
            $table->string('jenis', 30);
            /* nama persis seperti di database (bahasa Indonesia) */
            $table->string('nama');
            $table->string('nama_en')->nullable();
            $table->timestamps();

            $table->unique(['jenis', 'nama']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terjemahan_infografis');
    }
};
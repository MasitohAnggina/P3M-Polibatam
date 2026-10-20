<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengaturan', function (Blueprint $table) {
            $table->id();
            $table->text('kontak_alamat')->nullable();
            $table->string('kontak_email')->nullable();
            $table->string('kontak_telepon', 50)->nullable();
            $table->timestamps();
        });

        // Hanya satu baris. Diisi dengan data yang selama ini tertulis
        // di halaman Profil, supaya halaman publik tidak kosong.
        DB::table('pengaturan')->insert([
            'kontak_alamat' => 'Politeknik Negeri Batam, Jl. Ahmad Yani, Tlk. Tering, Batam Kota, Kepulauan Riau 29461',
            'kontak_email' => 'p2m@polibatam.ac.id',
            'kontak_telepon' => '0822-1199-6677',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pengaturan');
    }
};
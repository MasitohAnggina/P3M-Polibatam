<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengaturan extends Model
{
    protected $table = 'pengaturan';

    protected $fillable = ['kontak_alamat', 'kontak_email', 'kontak_telepon'];

    /** Tabel ini hanya berisi satu baris. Kalau belum ada, dibuatkan yang kosong. */
    public static function tunggal(): self
    {
        return static::query()->first() ?? static::create([]);
    }
}
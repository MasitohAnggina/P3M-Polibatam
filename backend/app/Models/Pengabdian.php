<?php

// app/Models/Pengabdian.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengabdian extends Model
{
    protected $table = 'pengabdian';

    protected $fillable = [
        'judul',
        'ketua',
        'mitra',
        'bidang',
        'kelompok',
        'program',
        'tahun',
        'abstrak',
        'anggota',
        'kata_kunci',
        'gambar',
    ];

    protected $casts = [
        'tahun'      => 'integer',
        'anggota'    => 'array',
        'kata_kunci' => 'array',
    ];
}
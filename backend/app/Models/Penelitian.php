<?php

// app/Models/Penelitian.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penelitian extends Model
{
    protected $table = 'penelitian';

    protected $fillable = [
        'judul',
        'ketua',
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
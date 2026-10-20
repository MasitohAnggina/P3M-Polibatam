<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hki extends Model
{
    protected $table = 'hki';

    protected $fillable = [
        'jenis',
        'kategori',
        'judul',
        'inventor',
        'nomor_permohonan',
        'tahun',
        'gambar',
    ];

    protected $casts = [
        'tahun'    => 'integer',
        'inventor' => 'array',
    ];
}
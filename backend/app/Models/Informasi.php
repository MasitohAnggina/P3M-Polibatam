<?php

// app/Models/Informasi.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Informasi extends Model
{
    protected $table = 'informasi';

    protected $fillable = [
        'judul',
        'kategori',
        'tanggal',
        'penulis',
        'isi',
        'lampiran',
        'gambar',
    ];

    protected $casts = [
        'tanggal'  => 'date:Y-m-d',
        'isi'      => 'array',
        'lampiran' => 'array',
    ];
}
<?php

// app/Models/Dokumen.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dokumen extends Model
{
    protected $table = 'dokumen';

    protected $fillable = [
        'judul',
        'kategori',
        'tahun',
        'tanggal',
        'keterangan',
        'format',
        'ukuran',
        'link_file',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];
}
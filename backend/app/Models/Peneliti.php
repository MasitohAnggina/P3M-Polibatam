<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peneliti extends Model
{
    protected $table = 'peneliti';

    protected $fillable = [
        'nama',
        'jabatan',
        'nidn',
        'email',
        'jurusan',
        'prodi',
        'laboratorium',
        'foto',
        'tentang',
        'keahlian',
        'pendidikan',
        'luaran',
        'tautan',
    ];

    protected $casts = [
        'keahlian'   => 'array',
        'pendidikan' => 'array',
        'luaran'     => 'array',
        'tautan'     => 'array',
    ];
}
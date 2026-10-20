<?php

// app/Models/TimHki.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimHki extends Model
{
    protected $table = 'tim_hki';

    protected $fillable = [
        'jabatan',
        'nama',
        'foto',
        'urutan',
    ];

    protected $casts = [
        'urutan' => 'integer',
    ];
}
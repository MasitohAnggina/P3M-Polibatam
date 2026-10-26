<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TerjemahanInfografis extends Model
{
    protected $table = 'terjemahan_infografis';

    protected $fillable = ['jenis', 'nama', 'nama_en'];
}
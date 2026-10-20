<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Publikasi extends Model
{
    protected $table = 'publikasi';

    /** Harus sama dengan pilihan kategori di frontend (admin & publik). */
    public const KATEGORI = [
        'Jurnal Internasional bereputasi',
        'Jurnal Nasional',
        'E-Book',
        'Prosiding',
    ];

    protected $fillable = [
        'slug',
        'title',
        'category',
        'year',
        'authors',
        'source_name',
        'source_detail',
        'indeks',
        'description',
        'href',
        'cover_path',
        'file_path',
    ];

    protected $casts = [
        'year' => 'integer',
    ];

    protected $appends = ['cover_url', 'file_url'];

    // path file disimpan di DB, yang dikirim ke frontend cukup URL-nya
    protected $hidden = ['cover_path', 'file_path'];

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? asset('storage/' . $this->cover_path) : null;
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : null;
    }

    /** Slug unik dari judul, mis. "judul-publikasi" atau "judul-publikasi-2". */
    public static function makeSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::limit(Str::slug($title), 80, '') ?: 'publikasi';
        $base = rtrim($base, '-');
        $slug = $base;
        $i = 2;

        while (
            static::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
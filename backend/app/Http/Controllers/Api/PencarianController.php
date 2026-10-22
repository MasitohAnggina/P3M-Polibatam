<?php

// app/Http/Controllers/Api/PencarianController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hki;
use App\Models\Informasi;
use App\Models\Pengabdian;
use App\Models\Penelitian;
use App\Models\Publikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class PencarianController extends Controller
{
    /* Sama dengan SEARCH_MIN_CHARS di Navbar dan halaman /pencarian */
    private const MIN_HURUF = 2;

    /* Kata kunci dipotong sampai sepanjang ini */
    private const MAKS_HURUF = 100;

    /* Jumlah hasil yang dikirim per kategori (total tetap dihitung semua) */
    private const PER_KATEGORI = 8;

    /* Kategori yang dicari. Urutannya dipakai untuk urutan tampil.
       Kolom ditulis sebagai daftar kandidat: yang dipakai hanya kolom yang
       benar-benar ada di tabel, jadi aman kalau nama kolom sedikit berbeda.
         judul    = kolom judul (kandidat pertama yang ada)
         tahun    = kolom tahun / tanggal untuk urutan dan tampilan
         subjudul = kolom keterangan singkat di bawah judul
         cari     = kolom lain yang ikut dicari (selain judul) */
    private const SUMBER = [
        'Penelitian' => [
            'model'    => Penelitian::class,
            'judul'    => ['judul', 'title'],
            'tahun'    => ['tahun', 'year'],
            'subjudul' => ['ketua', 'peneliti'],
            'cari'     => ['ketua', 'peneliti', 'bidang', 'skema', 'program', 'abstrak', 'kata_kunci', 'anggota'],
        ],
        'Pengabdian' => [
            'model'    => Pengabdian::class,
            'judul'    => ['judul', 'title'],
            'tahun'    => ['tahun', 'year'],
            'subjudul' => ['ketua'],
            'cari'     => ['ketua', 'mitra', 'bidang', 'program', 'abstrak', 'kata_kunci', 'anggota'],
        ],
        'Publikasi' => [
            'model'    => Publikasi::class,
            'judul'    => ['judul', 'title'],
            'tahun'    => ['tahun', 'year'],
            'subjudul' => ['sumber', 'jenis'],
            'cari'     => ['penulis', 'sumber', 'jenis', 'kategori', 'deskripsi', 'doi'],
        ],
        'HKI' => [
            'model'    => Hki::class,
            'judul'    => ['judul', 'title'],
            'tahun'    => ['tahun', 'year'],
            'subjudul' => ['pemegang', 'jenis'],
            'cari'     => ['pemegang', 'pencipta', 'inventor', 'jenis', 'nomor', 'nomor_pencatatan', 'deskripsi'],
        ],
        'Informasi' => [
            'model'    => Informasi::class,
            'judul'    => ['judul', 'title'],
            'tahun'    => ['tanggal'],
            'subjudul' => ['kategori'],
            'cari'     => ['kategori', 'isi'],
        ],
    ];

    /* GET /api/pencarian?q=kata  (publik) */
    public function index(Request $request): JsonResponse
    {
        $q = mb_substr(trim((string) $request->query('q', '')), 0, self::MAKS_HURUF);

        if (mb_strlen($q) < self::MIN_HURUF) {
            return response()->json([
                'message' => 'Kata kunci minimal ' . self::MIN_HURUF . ' huruf.',
            ], 422);
        }

        /* "!" dipakai sebagai karakter escape LIKE, supaya % dan _ yang
           diketik pengguna dicari apa adanya (jalan di MySQL maupun SQLite) */
        $pola = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';

        $kelompok = [];
        $total    = 0;

        foreach (self::SUMBER as $jenis => $cfg) {
            $hasil = $this->cari($jenis, $cfg, $pola);

            if ($hasil === null || $hasil['total'] === 0) {
                continue;
            }

            $total      += $hasil['total'];
            $kelompok[]  = $hasil;
        }

        return response()->json([
            'data' => [
                'query'    => $q,
                'total'    => $total,
                'kelompok' => $kelompok,
            ],
        ]);
    }

    /* Cari di satu kategori. Null kalau tabelnya belum punya kolom judul. */
    private function cari(string $jenis, array $cfg, string $pola): ?array
    {
        $model = new $cfg['model']();
        $tabel = $model->getTable();

        $ada = fn (array $kolom) => array_values(array_filter(
            $kolom,
            fn (string $k) => Schema::hasColumn($tabel, $k)
        ));

        $kolomJudul = $ada($cfg['judul'])[0] ?? null;
        if ($kolomJudul === null) {
            return null;
        }

        $kolomTahun    = $ada($cfg['tahun'])[0] ?? null;
        $kolomSubjudul = $ada($cfg['subjudul'])[0] ?? null;
        $kolomCari     = array_values(array_unique(array_merge([$kolomJudul], $ada($cfg['cari']))));

        $grammar = $model->getConnection()->getQueryGrammar();
        $tulis   = fn (string $kolom) => $grammar->wrap($tabel . '.' . $kolom);

        $query = $cfg['model']::query()->where(function ($where) use ($kolomCari, $pola, $tulis) {
            foreach ($kolomCari as $kolom) {
                $where->orWhereRaw($tulis($kolom) . " LIKE ? ESCAPE '!'", [$pola]);
            }
        });

        $total = (clone $query)->count();

        if ($total === 0) {
            return ['jenis' => $jenis, 'total' => 0, 'hasil' => []];
        }

        /* yang cocok di judul tampil lebih dulu, lalu yang terbaru */
        $query->orderByRaw(
            'CASE WHEN ' . $tulis($kolomJudul) . " LIKE ? ESCAPE '!' THEN 0 ELSE 1 END",
            [$pola]
        );

        if ($kolomTahun !== null) {
            $query->orderByDesc($tabel . '.' . $kolomTahun);
        }

        $baris = $query->orderByDesc($tabel . '.id')->limit(self::PER_KATEGORI)->get();

        return [
            'jenis' => $jenis,
            'total' => $total,
            'hasil' => $baris->map(fn ($b) => [
                'id'       => $b->id,
                'judul'    => (string) $b->{$kolomJudul},
                'subjudul' => $kolomSubjudul ? $this->teks($b->{$kolomSubjudul}) : null,
                'tahun'    => $kolomTahun ? $this->tahun($b->{$kolomTahun}) : null,
            ])->values()->all(),
        ];
    }

    /* Nilai kolom jadi teks singkat (kolom array, mis. penulis, digabung koma) */
    private function teks(mixed $nilai): ?string
    {
        if (is_array($nilai)) {
            $nilai = implode(', ', array_filter($nilai, 'is_string'));
        }

        $nilai = trim((string) $nilai);

        return $nilai === '' ? null : $nilai;
    }

    /* "2026", 2026, atau tanggal "2026-09-12" -> "2026" */
    private function tahun(mixed $nilai): ?string
    {
        if ($nilai instanceof \DateTimeInterface) {
            return $nilai->format('Y');
        }

        $nilai = substr(trim((string) $nilai), 0, 4);

        return $nilai === '' ? null : $nilai;
    }
}
<?php

// app/Http/Controllers/Api/DashboardController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hki;
use App\Models\Informasi;
use App\Models\Pengabdian;
use App\Models\Penelitian;
use App\Models\Publikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    /* Waktu yang ditampilkan di dashboard memakai WIB (Batam) */
    private const ZONA = 'Asia/Jakarta';

    /* Jumlah tahun yang dikirim untuk grafik tren (filter 3/5 tahun ada di frontend) */
    private const TAHUN_TREN = 5;

    /* Jumlah baris "Data Terbaru" */
    private const TERBARU = 5;

    /* Kategori di dashboard. Urutannya dipakai untuk donat dan daftar.
       judul = nama kolom judul, tahun = nama kolom tahun (null = dari kolom tanggal) */
    private const SUMBER = [
        'Penelitian' => ['model' => Penelitian::class, 'judul' => 'judul', 'tahun' => 'tahun', 'label' => 'penelitian'],
        'Pengabdian' => ['model' => Pengabdian::class, 'judul' => 'judul', 'tahun' => 'tahun', 'label' => 'pengabdian'],
        'Publikasi'  => ['model' => Publikasi::class,  'judul' => 'title', 'tahun' => 'year',  'label' => 'publikasi'],
        'HKI'        => ['model' => Hki::class,        'judul' => 'judul', 'tahun' => 'tahun', 'label' => 'HKI'],
        'Informasi'  => ['model' => Informasi::class,  'judul' => 'judul', 'tahun' => null,    'label' => 'informasi'],
    ];

    /* GET /api/admin/dashboard */
    public function index(): JsonResponse
    {
        $sekarang = now(self::ZONA);
        $tahunIni = $sekarang->year;
        $dari     = $tahunIni - self::TAHUN_TREN + 1;

        // jumlah per tahun untuk tiap kategori: [kategori => [tahun => jumlah]]
        $perTahun = [];
        foreach (array_keys(self::SUMBER) as $kategori) {
            $perTahun[$kategori] = $this->jumlahPerTahun($kategori, $dari, $tahunIni);
        }

        // total tiap kategori
        $kategori = [];
        foreach (self::SUMBER as $nama => $cfg) {
            $kategori[] = ['name' => $nama, 'value' => $cfg['model']::count()];
        }

        // tren tiap kategori (grafik batang memakai empat yang pertama)
        $tren = [];
        for ($tahun = $dari; $tahun <= $tahunIni; $tahun++) {
            $tren[] = [
                'year'       => (string) $tahun,
                'penelitian' => $perTahun['Penelitian'][$tahun] ?? 0,
                'pengabdian' => $perTahun['Pengabdian'][$tahun] ?? 0,
                'publikasi'  => $perTahun['Publikasi'][$tahun] ?? 0,
                'hki'        => $perTahun['HKI'][$tahun] ?? 0,
                'informasi'  => $perTahun['Informasi'][$tahun] ?? 0,
            ];
        }

        // pertumbuhan total semua kategori dibanding tahun lalu
        $totalIni  = array_sum(array_map(fn ($p) => $p[$tahunIni] ?? 0, $perTahun));
        $totalLalu = array_sum(array_map(fn ($p) => $p[$tahunIni - 1] ?? 0, $perTahun));

        $terbaru = $this->dataTerbaru();

        return response()->json([
            'data' => [
                'kategori'          => $kategori,
                'tren'              => $tren,
                'pertumbuhan_total' => $this->persen($totalIni, $totalLalu),
                'terbaru'           => $terbaru->map(fn ($i) => [
                    'id'       => $i['id'],
                    'title'    => $i['judul'],
                    'category' => $i['kategori'],
                    'date'     => $i['diubah']->copy()->timezone(self::ZONA)->format('Y-m-d'),
                ])->values(),
                'diperbarui'        => $terbaru->first()
                    ? $terbaru->first()['diubah']->copy()->timezone(self::ZONA)->format('Y-m-d')
                    : null,
            ],
        ]);
    }

    /* [tahun => jumlah] untuk satu kategori, antara $dari dan $sampai.
       Informasi tidak punya kolom tahun, jadi tahunnya diambil dari tanggal
       (dihitung di PHP supaya jalan di MySQL maupun SQLite). */
    private function jumlahPerTahun(string $kategori, int $dari, int $sampai): array
    {
        $cfg = self::SUMBER[$kategori];

        if ($cfg['tahun'] === null) {
            return Informasi::query()
                ->whereBetween('tanggal', ["$dari-01-01", "$sampai-12-31"])
                ->pluck('tanggal')
                ->countBy(fn ($tanggal) => (int) $tanggal->format('Y'))
                ->all();
        }

        return $cfg['model']::query()
            ->whereBetween($cfg['tahun'], [$dari, $sampai])
            ->selectRaw($cfg['tahun'] . ' as tahun, COUNT(*) as total')
            ->groupBy($cfg['tahun'])
            ->pluck('total', 'tahun')
            ->map(fn ($n) => (int) $n)
            ->all();
    }

    /* Data yang terakhir ditambahkan atau diubah dari semua kategori */
    private function dataTerbaru(): Collection
    {
        $hasil = collect();

        foreach (self::SUMBER as $nama => $cfg) {
            $baris = $cfg['model']::query()
                ->whereNotNull('updated_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->limit(self::TERBARU)
                ->get(['id', $cfg['judul'], 'updated_at']);

            foreach ($baris as $b) {
                $hasil->push([
                    'id'       => $b->id,
                    'kategori' => $nama,
                    'judul'    => $b->{$cfg['judul']},
                    'diubah'   => $b->updated_at,
                ]);
            }
        }

        return $hasil
            ->sortByDesc(fn ($i) => $i['diubah']->getTimestamp())
            ->take(self::TERBARU)
            ->values();
    }

    /* "+11%" / "-5%". Null kalau tahun lalu belum ada data. */
    private function persen(int $sekarang, int $sebelumnya): ?string
    {
        if ($sebelumnya <= 0) {
            return null;
        }

        return sprintf('%+d%%', round(($sekarang - $sebelumnya) / $sebelumnya * 100));
    }
}
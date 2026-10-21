<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hki;
use App\Models\Pengabdian;
use App\Models\Penelitian;
use App\Models\Peneliti;
use App\Models\Publikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/* =========================================================
   INFOGRAFIS (publik)
   GET /api/infografis

   Data dihitung per (tahun, program studi). Prodi dan jurusan
   sebuah kegiatan diambil dari PENELITI yang namanya cocok:
   - penelitian dan pengabdian: ketua pengusul
   - publikasi dan HKI: penulis / inventor pertama yang cocok
   Nama dicocokkan dengan Profil Peneliti (tanpa gelar, tidak
   peduli huruf besar/kecil). Kegiatan yang namanya tidak cocok
   dengan siapa pun masuk ke "Lainnya".

   Partisipasi dosen: peneliti dihitung ikut kalau namanya muncul
   di ketua, anggota, penulis, atau inventor pada tahun itu.

   Belum ada datanya (tampil 0): kategori dosen DTPS/DTPR,
   level publikasi "Internal", status penulis, status
   Diterima/Direview.
========================================================= */

class InfografisController extends Controller
{
    private const LAIN = 'Lainnya';

    private const KATEGORI_INTERNASIONAL = 'Jurnal Internasional bereputasi';
    private const KATEGORI_NASIONAL = 'Jurnal Nasional';
    private const KATEGORI_BUKU = 'E-Book';
    private const KATEGORI_PROSIDING = 'Prosiding';

    public function index(): JsonResponse
    {
        $peneliti = $this->daftarPeneliti();

        $penelitian = Penelitian::query()->get();
        $pengabdian = Pengabdian::query()->get();
        $publikasi = Publikasi::query()->get();
        $hki = Hki::query()->get();

        /* ---------- TAHUN ---------- */

        $tahun = collect()
            ->merge($penelitian->pluck('tahun'))
            ->merge($pengabdian->pluck('tahun'))
            ->merge($publikasi->pluck('year'))
            ->merge($hki->pluck('tahun'))
            ->map(fn ($t) => (int) $t)
            ->filter(fn ($t) => $t > 0)
            ->unique()
            ->sort()
            ->values();

        if ($tahun->isEmpty()) {
            $tahun = collect([(int) now()->year]);
        }

        /* ---------- KUMPULKAN KEGIATAN ---------- */

        /* tiap kegiatan: tahun, id pemilik (atau null), id peserta, atribut tambahan */
        $kegiatan = ['penelitian' => [], 'pengabdian' => [], 'publikasi' => [], 'hki' => []];

        foreach ($penelitian as $item) {
            $kegiatan['penelitian'][] = [
                'tahun'  => (int) $item->tahun,
                'pemilik' => $this->pertama($peneliti, (string) $item->ketua),
                'peserta' => $this->semua($peneliti, $item->ketua . ' ; ' . implode(' ; ', (array) $item->anggota)),
                'program' => trim((string) $item->program) ?: 'Lainnya',
            ];
        }

        foreach ($pengabdian as $item) {
            $kegiatan['pengabdian'][] = [
                'tahun'  => (int) $item->tahun,
                'pemilik' => $this->pertama($peneliti, (string) $item->ketua),
                'peserta' => $this->semua($peneliti, $item->ketua . ' ; ' . implode(' ; ', (array) $item->anggota)),
                'program' => trim((string) $item->program) ?: 'Lainnya',
            ];
        }

        foreach ($publikasi as $item) {
            $teks = (string) $item->authors;

            $kegiatan['publikasi'][] = [
                'tahun'    => (int) $item->year,
                'pemilik'  => $this->pertama($peneliti, $teks),
                'peserta'  => $this->semua($peneliti, $teks),
                'kategori' => (string) $item->category,
            ];
        }

        foreach ($hki as $item) {
            $teks = implode(' ; ', (array) $item->inventor);

            $kegiatan['hki'][] = [
                'tahun'   => (int) $item->tahun,
                'pemilik' => $this->pertama($peneliti, $teks),
                'peserta' => $this->semua($peneliti, $teks),
            ];
        }

        /* ---------- DAFTAR PRODI DAN JURUSAN ---------- */

        $prodi = $peneliti
            ->map(fn ($p) => ['name' => $p['prodi'], 'jurusan' => $p['jurusan']])
            ->unique('name')
            ->values();

        $adaLain = collect($kegiatan)
            ->flatten(1)
            ->contains(fn ($k) => $k['pemilik'] === null);

        if ($adaLain) {
            $prodi->push(['name' => self::LAIN, 'jurusan' => self::LAIN]);
        }

        $prodi = $prodi
            ->unique('name')
            ->sortBy('name')
            ->values();

        $prodiList = $this->beriSingkatan($prodi);
        $jurusanList = $prodiList->pluck('jurusan')->unique()->sort()->values();

        /* ---------- BARIS (tahun x prodi) ---------- */

        $baris = [];

        foreach ($tahun as $t) {
            foreach ($prodiList as $p) {
                $baris[$t . '|' . $p['name']] = $this->barisKosong(
                    $t,
                    $p['name'],
                    $p['jurusan'],
                    $peneliti->where('prodi', $p['name'])->count()
                );
            }
        }

        $kunci = function (int $t, ?int $idPeneliti) use ($peneliti) {
            $prodiNama = $idPeneliti === null
                ? self::LAIN
                : $peneliti->firstWhere('id', $idPeneliti)['prodi'];

            return $t . '|' . $prodiNama;
        };

        /* total per jenis kegiatan */
        foreach ($kegiatan['penelitian'] as $k) {
            $key = $kunci($k['tahun'], $k['pemilik']);
            if (! isset($baris[$key])) continue;

            $baris[$key]['penelitian']++;
            $baris[$key]['programPenelitian'][$k['program']] =
                ($baris[$key]['programPenelitian'][$k['program']] ?? 0) + 1;
        }

        foreach ($kegiatan['pengabdian'] as $k) {
            $key = $kunci($k['tahun'], $k['pemilik']);
            if (! isset($baris[$key])) continue;

            $baris[$key]['pengabdian']++;
            $baris[$key]['jenisPengabdian'][$k['program']] =
                ($baris[$key]['jenisPengabdian'][$k['program']] ?? 0) + 1;
        }

        foreach ($kegiatan['publikasi'] as $k) {
            $key = $kunci($k['tahun'], $k['pemilik']);
            if (! isset($baris[$key])) continue;

            $baris[$key]['publikasi']++;

            match ($k['kategori']) {
                self::KATEGORI_INTERNASIONAL => [
                    $baris[$key]['pubInternasional']++,
                    $baris[$key]['jurnal']++,
                ],
                self::KATEGORI_NASIONAL => [
                    $baris[$key]['pubNasional']++,
                    $baris[$key]['jurnal']++,
                ],
                self::KATEGORI_BUKU => $baris[$key]['buku']++,
                self::KATEGORI_PROSIDING => $baris[$key]['prosiding']++,
                default => $baris[$key]['lainnya']++,
            };
        }

        foreach ($kegiatan['hki'] as $k) {
            $key = $kunci($k['tahun'], $k['pemilik']);
            if (! isset($baris[$key])) continue;

            $baris[$key]['hki']++;
        }

        /* ---------- PARTISIPASI DOSEN (peserta unik per prodi dan tahun) ---------- */

        $peserta = []; // [key][jenis] = [idPeneliti => true]
        $kinerja = []; // [idPeneliti] = [penelitian, pengabdian, publikasi]

        foreach (['penelitian', 'pengabdian', 'publikasi'] as $jenis) {
            foreach ($kegiatan[$jenis] as $k) {
                foreach ($k['peserta'] as $id) {
                    $prodiNama = $peneliti->firstWhere('id', $id)['prodi'];
                    $key = $k['tahun'] . '|' . $prodiNama;

                    $peserta[$key][$jenis][$id] = true;
                    $kinerja[$id][$jenis] = ($kinerja[$id][$jenis] ?? 0) + 1;
                }
            }
        }

        foreach ($baris as $key => &$row) {
            $row['partPenelitian'] = count($peserta[$key]['penelitian'] ?? []);
            $row['partPengabdian'] = count($peserta[$key]['pengabdian'] ?? []);
            $row['partPublikasi'] = count($peserta[$key]['publikasi'] ?? []);
        }
        unset($row);

        /* ---------- KINERJA PER DOSEN ---------- */

        $dosen = $peneliti->map(function ($p) use ($kinerja, $prodiList) {
            $short = $prodiList->firstWhere('name', $p['prodi'])['short'] ?? $p['prodi'];

            return [
                'name'       => $p['nama'],
                'nip'        => $p['nidn'] ?: '-',
                'prodi'      => $short,
                'jurusan'    => $p['jurusan'],
                'penelitian' => $kinerja[$p['id']]['penelitian'] ?? 0,
                'pengabdian' => $kinerja[$p['id']]['pengabdian'] ?? 0,
                'publikasi'  => $kinerja[$p['id']]['publikasi'] ?? 0,
            ];
        })->values();

        /* ---------- TANGGAL PEMBARUAN ---------- */

        $diperbarui = collect([Penelitian::class, Pengabdian::class, Publikasi::class, Hki::class, Peneliti::class])
            ->map(fn ($model) => $model::query()->max('updated_at'))
            ->filter()
            ->max();

        return response()->json([
            'data' => [
                'updated_at' => $diperbarui
                    ? \Illuminate\Support\Carbon::parse($diperbarui)->timezone('Asia/Jakarta')->format('Y-m-d')
                    : now('Asia/Jakarta')->format('Y-m-d'),
                'years'      => $tahun,
                'jurusan'    => $jurusanList,
                'prodi'      => $prodiList,
                'rows'       => array_values($baris),
                'dosen'      => $dosen,
            ],
        ]);
    }

    /* =========================================================
       PENCOCOKAN NAMA
    ========================================================= */

    private function daftarPeneliti()
    {
        return Peneliti::query()
            ->orderBy('nama')
            ->get()
            ->map(fn (Peneliti $p) => [
                'id'      => $p->id,
                'nama'    => $p->nama,
                'nidn'    => $p->nidn,
                'prodi'   => trim((string) $p->prodi) ?: self::LAIN,
                'jurusan' => trim((string) $p->jurusan) ?: self::LAIN,
                'kunci'   => $this->normalisasi($this->namaInti($p->nama)),
            ])
            ->filter(fn ($p) => mb_strlen($p['kunci']) >= 4)
            ->values();
    }

    /* "Dr. Rina Marlina, S.Kom., M.Kom." -> "Rina Marlina" */
    private function namaInti(string $nama): string
    {
        $nama = preg_replace('/^((Dr|Prof|Ir|Drs|Dra|H|Hj)\.?\s+)+/i', '', trim($nama));

        return trim(explode(',', $nama)[0]);
    }

    /* huruf kecil, tanpa tanda baca, spasi tunggal */
    private function normalisasi(string $teks): string
    {
        $teks = Str::lower(Str::ascii($teks));
        $teks = preg_replace('/[^a-z0-9]+/', ' ', $teks);

        return trim($teks);
    }

    /* Id peneliti pertama yang namanya muncul di teks (null kalau tidak ada) */
    private function pertama($peneliti, string $teks): ?int
    {
        $ditemukan = $this->cocok($peneliti, $teks);

        return $ditemukan ? array_key_first($ditemukan) : null;
    }

    /* Semua id peneliti yang namanya muncul di teks */
    private function semua($peneliti, string $teks): array
    {
        return array_keys($this->cocok($peneliti, $teks));
    }

    /* [idPeneliti => posisi], urut dari yang paling awal muncul */
    private function cocok($peneliti, string $teks): array
    {
        $haystack = ' ' . $this->normalisasi($teks) . ' ';
        $hasil = [];

        foreach ($peneliti as $p) {
            $posisi = mb_strpos($haystack, ' ' . $p['kunci'] . ' ');

            if ($posisi !== false) {
                $hasil[$p['id']] = $posisi;
            }
        }

        asort($hasil);

        return $hasil;
    }

    /* =========================================================
       BANTUAN
    ========================================================= */

    private function beriSingkatan($prodi)
    {
        $dipakai = [];

        return $prodi->map(function ($p) use (&$dipakai) {
            $kata = preg_split('/\s+/', trim($p['name']));
            $singkat = collect($kata)
                ->reject(fn ($k) => in_array(Str::lower($k), ['dan', 'di', 'ke', 'of', 'the'], true))
                ->map(fn ($k) => Str::upper(Str::substr($k, 0, 1)))
                ->implode('');

            if ($singkat === '' || in_array($singkat, $dipakai, true)) {
                $singkat = $p['name'];
            }

            $dipakai[] = $singkat;

            return $p + ['short' => $singkat];
        });
    }

    private function barisKosong(int $tahun, string $prodi, string $jurusan, int $dosen): array
    {
        return [
            'year'             => $tahun,
            'prodi'            => $prodi,
            'jurusan'          => $jurusan,
            'category'         => '-',
            'dosen'            => $dosen,
            'partPenelitian'   => 0,
            'partPengabdian'   => 0,
            'partPublikasi'    => 0,
            'penelitian'       => 0,
            'pengabdian'       => 0,
            'publikasi'        => 0,
            'hki'              => 0,
            'pubInternal'      => 0,
            'pubNasional'      => 0,
            'pubInternasional' => 0,
            'jurnal'           => 0,
            'prosiding'        => 0,
            'buku'             => 0,
            'lainnya'          => 0,
            'programPenelitian' => [],
            'jenisPengabdian'  => [],
        ];
    }
}
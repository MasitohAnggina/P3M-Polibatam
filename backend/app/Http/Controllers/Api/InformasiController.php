<?php

// app/Http/Controllers/Api/InformasiController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Informasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class InformasiController extends Controller
{
    private const GAMBAR_DIR   = 'informasi/gambar';
    private const LAMPIRAN_DIR = 'informasi/lampiran';

    /* Harus sama dengan pilihan kategori di halaman admin dan publik */
    private const KATEGORI = ['Informasi', 'Kegiatan', 'Penelitian', 'Pengabdian', 'Panduan', 'Pengumuman', 'Agenda'];

    /* Publik (/api/informasi) dan admin (/api/admin/informasi):
       terbaru di atas */
    public function index(): JsonResponse
    {
        $items = Informasi::query()
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Informasi $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu informasi */
    public function show(Informasi $informasi): JsonResponse
    {
        return response()->json(['data' => $this->format($informasi)]);
    }

    /* Admin: tambah informasi */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);
        $isi  = $this->bacaIsi($request);

        $data['isi'] = $isi;
        $data['penulis'] = $this->rapikanTeks($request->input('penulis'));
        $data['lampiran'] = $this->susunLampiran($request, []);
        $data['gambar'] = $request->hasFile('gambar')
            ? $request->file('gambar')->store(self::GAMBAR_DIR, 'public')
            : null;

        $item = Informasi::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    /* Admin: ubah informasi */
    public function update(Request $request, Informasi $informasi): JsonResponse
    {
        $data = $this->validasi($request);

        $data['isi'] = $this->bacaIsi($request);
        $data['penulis'] = $this->rapikanTeks($request->input('penulis'));

        // lampiran: file lama yang tidak dipertahankan dihapus dari disk
        $lama = $informasi->lampiran ?? [];
        $baru = $this->susunLampiran($request, $lama);
        $this->hapusLampiranYangTidakDipakai($lama, $baru);
        $data['lampiran'] = $baru;

        // gambar
        if ($request->hasFile('gambar')) {
            $this->hapus($informasi->gambar);
            $data['gambar'] = $request->file('gambar')->store(self::GAMBAR_DIR, 'public');
        } elseif ($request->boolean('hapus_gambar')) {
            $this->hapus($informasi->gambar);
            $data['gambar'] = null;
        }

        $informasi->update($data);

        return response()->json(['data' => $this->format($informasi->fresh())]);
    }

    /* Admin: hapus informasi beserta gambar dan lampirannya */
    public function destroy(Informasi $informasi): JsonResponse
    {
        $this->hapus($informasi->gambar);

        foreach ($informasi->lampiran ?? [] as $lampiran) {
            $this->hapus($lampiran['path'] ?? null);
        }

        $informasi->delete();

        return response()->json(['message' => 'Data informasi berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
    ========================================================= */

    private function validasi(Request $request): array
    {
        return $request->validate([
            'judul'    => ['required', 'string', 'max:500'],
            'kategori' => ['required', 'in:' . implode(',', self::KATEGORI)],
            'tanggal'  => ['required', 'date_format:Y-m-d'],
            'penulis'  => ['nullable', 'string', 'max:255'],
            // Semua jenis gambar diterima, tanpa batas resolusi
            'gambar'   => ['nullable', 'image'],

            'lampiran'              => ['nullable', 'array', 'max:20'],
            'lampiran.*.label'      => ['required', 'string', 'max:255'],
            'lampiran.*.url'        => ['nullable', 'url', 'max:1000'],
            'lampiran.*.path'       => ['nullable', 'string', 'max:500'],
            'lampiran.*.file'       => [
                'nullable', 'file', 'max:20480',
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar,jpg,jpeg,png',
            ],
        ], [
            'judul.required'    => 'Judul informasi wajib diisi.',
            'kategori.required' => 'Kategori wajib dipilih.',
            'kategori.in'       => 'Kategori tidak valid.',
            'tanggal.required'  => 'Tanggal wajib diisi.',
            'tanggal.date_format' => 'Format tanggal tidak valid.',
            'gambar.image'      => 'File gambar harus berupa gambar.',
            'gambar.uploaded'   => 'Gambar gagal diunggah. Ukuran file melebihi batas server (upload_max_filesize).',
            'lampiran.max'      => 'Lampiran maksimal 20 item.',
            'lampiran.*.label.required' => 'Nama lampiran wajib diisi.',
            'lampiran.*.url.url'        => 'Tautan lampiran harus berupa URL yang valid (https://...).',
            'lampiran.*.file.mimes'     => 'Format file lampiran tidak didukung.',
            'lampiran.*.file.max'       => 'Ukuran file lampiran maksimal 20 MB.',
            'lampiran.*.file.uploaded'  => 'File lampiran gagal diunggah. Ukuran file melebihi batas server (upload_max_filesize).',
        ]);
    }

    private function rapikanTeks(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value === '' ? null : $value;
    }

    /* =========================================================
       ISI (blok): { type: p | list | table }
       Frontend mengirim JSON string pada field "isi".
       Blok yang kosong dibuang.
    ========================================================= */

    private function bacaIsi(Request $request): array
    {
        $raw = $request->input('isi');

        if ($raw === null || $raw === '') {
            return [];
        }

        $blocks = is_string($raw) ? json_decode($raw, true) : $raw;

        if (! is_array($blocks)) {
            throw ValidationException::withMessages(['isi' => 'Format isi informasi tidak valid.']);
        }

        $teks = fn ($v) => is_string($v) ? trim($v) : '';
        $hasil = [];

        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }

            switch ($block['type'] ?? null) {
                case 'p':
                    $text = $teks($block['text'] ?? '');
                    if ($text !== '') {
                        $hasil[] = ['type' => 'p', 'text' => $text];
                    }
                    break;

                case 'list':
                    $items = array_values(array_filter(
                        array_map($teks, (array) ($block['items'] ?? [])),
                        fn ($v) => $v !== ''
                    ));
                    if ($items) {
                        $hasil[] = ['type' => 'list', 'items' => $items];
                    }
                    break;

                case 'table':
                    $head = array_values((array) ($block['head'] ?? []));
                    $rows = [];
                    foreach ((array) ($block['rows'] ?? []) as $row) {
                        $row = array_values((array) $row);
                        $a = $teks($row[0] ?? '');
                        $b = $teks($row[1] ?? '');
                        if ($a !== '' || $b !== '') {
                            $rows[] = [$a, $b];
                        }
                    }
                    if ($rows) {
                        $hasil[] = [
                            'type' => 'table',
                            'head' => [$teks($head[0] ?? '') ?: 'Keterangan', $teks($head[1] ?? '') ?: 'Detail'],
                            'rows' => $rows,
                        ];
                    }
                    break;
            }
        }

        return $hasil;
    }

    /* =========================================================
       LAMPIRAN: tiap item berupa tautan (url) atau file (path)
       - file baru   : lampiran[i][file]
       - file lama   : lampiran[i][path] (harus ada di lampiran lama)
       - tautan      : lampiran[i][url]
    ========================================================= */

    private function susunLampiran(Request $request, array $lama): array
    {
        $pathLama = array_filter(array_map(fn ($l) => $l['path'] ?? null, $lama));
        $hasil = [];

        foreach ((array) $request->input('lampiran', []) as $i => $item) {
            $label = is_array($item) ? trim((string) ($item['label'] ?? '')) : '';
            if ($label === '') {
                continue;
            }

            $file = $request->file("lampiran.$i.file");

            if ($file instanceof UploadedFile) {
                $hasil[] = [
                    'label' => $label,
                    'url'   => null,
                    'path'  => $file->store(self::LAMPIRAN_DIR, 'public'),
                ];
                continue;
            }

            $path = $item['path'] ?? null;
            if (is_string($path) && in_array($path, $pathLama, true)) {
                $hasil[] = ['label' => $label, 'url' => null, 'path' => $path];
                continue;
            }

            $url = trim((string) ($item['url'] ?? ''));
            if ($url !== '') {
                $hasil[] = ['label' => $label, 'url' => $url, 'path' => null];
            }
        }

        return $hasil;
    }

    private function hapusLampiranYangTidakDipakai(array $lama, array $baru): void
    {
        $dipakai = array_filter(array_map(fn ($l) => $l['path'] ?? null, $baru));

        foreach ($lama as $item) {
            $path = $item['path'] ?? null;
            if ($path && ! in_array($path, $dipakai, true)) {
                $this->hapus($path);
            }
        }
    }

    /* =========================================================
       FORMAT RESPONSE (path file diubah menjadi URL lengkap)
    ========================================================= */

    private function format(Informasi $item): array
    {
        return [
            'id'       => $item->id,
            'judul'    => $item->judul,
            'kategori' => $item->kategori,
            'tanggal'  => $item->tanggal?->format('Y-m-d'),
            'penulis'  => $item->penulis,
            'isi'      => $item->isi ?? [],
            'lampiran' => collect($item->lampiran ?? [])->map(fn ($l) => [
                'label' => $l['label'],
                'href'  => ! empty($l['path'])
                    ? asset('storage/' . $l['path'])
                    : ($l['url'] ?? ''),
                'path'  => $l['path'] ?? null,
            ])->values(),
            'gambar'   => $item->gambar
                ? asset('storage/' . $item->gambar)
                : null,
        ];
    }

    private function hapus(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
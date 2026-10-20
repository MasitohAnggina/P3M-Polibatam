<?php

// app/Http/Controllers/Api/DokumenController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dokumen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DokumenController extends Controller
{
    /* Harus sama dengan pilihan jenis dokumen di halaman admin dan publik */
    private const KATEGORI = ['Panduan', 'Template', 'Formulir', 'SK & Surat Edaran'];

    /* Harus sama dengan pilihan format file di halaman admin */
    private const FORMAT = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'ZIP'];

    /* Publik (/api/dokumen) dan admin (/api/admin/dokumen):
       tahun terbaru di atas, lalu tanggal terbaru */
    public function index(): JsonResponse
    {
        $items = Dokumen::query()
            ->orderByDesc('tahun')
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Dokumen $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu dokumen */
    public function show(Dokumen $dokumen): JsonResponse
    {
        return response()->json(['data' => $this->format($dokumen)]);
    }

    /* Admin: tambah dokumen */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);

        $item = Dokumen::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    /* Admin: ubah dokumen */
    public function update(Request $request, Dokumen $dokumen): JsonResponse
    {
        $data = $this->validasi($request);

        $dokumen->update($data);

        return response()->json(['data' => $this->format($dokumen->fresh())]);
    }

    /* Admin: hapus dokumen */
    public function destroy(Dokumen $dokumen): JsonResponse
    {
        $dokumen->delete();

        return response()->json(['message' => 'Data dokumen berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
    ========================================================= */

    private function validasi(Request $request): array
    {
        $data = $request->validate([
            'judul'      => ['required', 'string', 'max:500'],
            'kategori'   => ['required', 'in:' . implode(',', self::KATEGORI)],
            'tahun'      => ['required', 'digits:4'],
            'tanggal'    => ['nullable', 'date_format:Y-m-d'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
            'format'     => ['nullable', 'in:' . implode(',', self::FORMAT)],
            'ukuran'     => ['nullable', 'string', 'max:30'],
            // "#" (file belum tersedia), URL lengkap, atau path di folder public
            'link_file'  => ['required', 'string', 'max:1000', 'regex:/^(#|https?:\/\/\S+|\/\S+)$/'],
        ], [
            'judul.required'         => 'Judul dokumen wajib diisi.',
            'kategori.required'      => 'Jenis dokumen wajib dipilih.',
            'kategori.in'            => 'Jenis dokumen tidak valid.',
            'tahun.required'         => 'Tahun wajib diisi.',
            'tahun.digits'           => 'Tahun harus berupa 4 angka.',
            'tanggal.date_format'    => 'Format tanggal tidak valid.',
            'format.in'              => 'Format file tidak valid.',
            'link_file.required'     => 'Link file wajib diisi (isi "#" jika file belum tersedia).',
            'link_file.regex'        => 'Link file harus berupa URL (https://...), path (/dokumen/nama.pdf), atau "#".',
        ]);

        $data['keterangan'] = $this->rapikanTeks($data['keterangan'] ?? null);
        $data['ukuran']     = $this->rapikanTeks($data['ukuran'] ?? null);
        $data['format']     = $this->rapikanTeks($data['format'] ?? null);
        $data['judul']      = trim($data['judul']);
        $data['link_file']  = trim($data['link_file']);

        return $data;
    }

    private function rapikanTeks(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value === '' ? null : $value;
    }

    /* =========================================================
       FORMAT RESPONSE
    ========================================================= */

    private function format(Dokumen $item): array
    {
        return [
            'id'         => $item->id,
            'judul'      => $item->judul,
            'kategori'   => $item->kategori,
            'tahun'      => $item->tahun,
            'tanggal'    => $item->tanggal?->format('Y-m-d'),
            'keterangan' => $item->keterangan,
            'format'     => $item->format,
            'ukuran'     => $item->ukuran,
            'link_file'  => $item->link_file,
        ];
    }
}
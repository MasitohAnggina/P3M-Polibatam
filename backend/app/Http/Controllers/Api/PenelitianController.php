<?php

// app/Http/Controllers/Api/PenelitianController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Penelitian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class PenelitianController extends Controller
{
    private const GAMBAR_DIR = 'penelitian';

    /* Publik (/api/penelitian) dan admin (/api/admin/penelitian):
       terbaru di atas (tahun terbesar dulu) */
    public function index(): JsonResponse
    {
        $items = Penelitian::query()
            ->orderByDesc('tahun')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Penelitian $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu penelitian */
    public function show(Penelitian $penelitian): JsonResponse
    {
        return response()->json(['data' => $this->format($penelitian)]);
    }

    /* Admin: tambah penelitian */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);
        $data = $this->rapikan($request, $data);

        $data['gambar'] = $request->hasFile('gambar')
            ? $this->simpanGambar($request->file('gambar'))
            : null;

        $item = Penelitian::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    /* Admin: ubah penelitian */
    public function update(Request $request, Penelitian $penelitian): JsonResponse
    {
        $data = $this->validasi($request);
        $data = $this->rapikan($request, $data);

        if ($request->hasFile('gambar')) {
            $this->hapusGambar($penelitian->gambar);
            $data['gambar'] = $this->simpanGambar($request->file('gambar'));
        } elseif ($request->boolean('hapus_gambar')) {
            $this->hapusGambar($penelitian->gambar);
            $data['gambar'] = null;
        } else {
            unset($data['gambar']); // gambar lama dipertahankan
        }

        $penelitian->update($data);

        return response()->json(['data' => $this->format($penelitian->fresh())]);
    }

    /* Admin: hapus penelitian beserta file gambarnya */
    public function destroy(Penelitian $penelitian): JsonResponse
    {
        $this->hapusGambar($penelitian->gambar);
        $penelitian->delete();

        return response()->json(['message' => 'Data penelitian berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
    ========================================================= */

    private function validasi(Request $request): array
    {
        return $request->validate([
            'judul'        => ['required', 'string', 'max:500'],
            'ketua'        => ['required', 'string', 'max:255'],
            'bidang'       => ['nullable', 'string', 'max:255'],
            'kelompok'     => ['nullable', 'in:Internal,Eksternal'],
            'program'      => ['required', 'string', 'max:150'],
            'tahun'        => ['required', 'digits:4'],
            'abstrak'      => ['nullable', 'string'],
            'anggota'      => ['nullable', 'array'],
            'anggota.*'    => ['string', 'max:255'],
            'kata_kunci'   => ['nullable', 'array'],
            'kata_kunci.*' => ['string', 'max:100'],
            // Semua jenis gambar diterima, tanpa batas resolusi
            'gambar'       => ['nullable', 'image'],
        ], [
            'judul.required'   => 'Judul penelitian wajib diisi.',
            'ketua.required'   => 'Ketua pengusul wajib diisi.',
            'program.required' => 'Program wajib dipilih.',
            'tahun.required'   => 'Tahun wajib diisi.',
            'tahun.digits'     => 'Tahun harus 4 digit angka.',
            'gambar.image'     => 'File gambar harus berupa gambar.',
            'gambar.uploaded'  => 'Gambar gagal diunggah. Ukuran file melebihi batas server (upload_max_filesize).',
        ]);
    }

    /* Frontend selalu mengirim daftar anggota dan kata kunci secara
       lengkap, jadi isi lama cukup diganti. Daftar kosong disimpan [] */
    private function rapikan(Request $request, array $data): array
    {
        $data['anggota'] = array_values(array_filter(
            (array) $request->input('anggota', []),
            fn ($v) => is_string($v) && trim($v) !== ''
        ));

        $data['kata_kunci'] = array_values(array_filter(
            (array) $request->input('kata_kunci', []),
            fn ($v) => is_string($v) && trim($v) !== ''
        ));

        return $data;
    }

    /* =========================================================
       FORMAT RESPONSE (path gambar diubah menjadi URL lengkap)
    ========================================================= */

    private function format(Penelitian $item): array
    {
        return [
            'id'         => $item->id,
            'judul'      => $item->judul,
            'ketua'      => $item->ketua,
            'bidang'     => $item->bidang,
            'kelompok'   => $item->kelompok,
            'program'    => $item->program,
            'tahun'      => $item->tahun,
            'abstrak'    => $item->abstrak,
            'anggota'    => $item->anggota ?? [],
            'kata_kunci' => $item->kata_kunci ?? [],
            'gambar'     => $item->gambar
                ? asset('storage/' . $item->gambar)
                : null,
        ];
    }

    /* =========================================================
       GAMBAR (disimpan apa adanya: format dan resolusi bebas)
    ========================================================= */

    private function simpanGambar(UploadedFile $file): string
    {
        return $file->store(self::GAMBAR_DIR, 'public');
    }

    private function hapusGambar(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
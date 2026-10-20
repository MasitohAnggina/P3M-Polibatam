<?php

// app/Http/Controllers/Api/TimHkiController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimHki;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TimHkiController extends Controller
{
    private const FOTO_DIR = 'tim-hki/foto';

    /* Publik (/api/tim-hki) dan admin (/api/admin/tim-hki):
       urut berdasarkan kolom urutan */
    public function index(): JsonResponse
    {
        $items = TimHki::query()
            ->orderBy('urutan')
            ->orderBy('id')
            ->get()
            ->map(fn (TimHki $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu anggota */
    public function show(TimHki $timHki): JsonResponse
    {
        return response()->json(['data' => $this->format($timHki)]);
    }

    /* Admin: tambah anggota */
    public function store(Request $request): JsonResponse
    {
        $data = collect($this->validasi($request))->except('foto')->all();

        $data['jabatan'] = trim($data['jabatan']);
        $data['nama']    = trim($data['nama']);
        $data['urutan']  = $data['urutan'] ?? ((int) TimHki::max('urutan') + 1);
        $data['foto']    = $request->hasFile('foto')
            ? $request->file('foto')->store(self::FOTO_DIR, 'public')
            : null;

        $item = TimHki::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    /* Admin: ubah anggota */
    public function update(Request $request, TimHki $timHki): JsonResponse
    {
        $data = collect($this->validasi($request))->except('foto')->all();

        $data['jabatan'] = trim($data['jabatan']);
        $data['nama']    = trim($data['nama']);
        $data['urutan']  = $data['urutan'] ?? $timHki->urutan;

        if ($request->hasFile('foto')) {
            $this->hapus($timHki->foto);
            $data['foto'] = $request->file('foto')->store(self::FOTO_DIR, 'public');
        } elseif ($request->boolean('hapus_foto')) {
            $this->hapus($timHki->foto);
            $data['foto'] = null;
        }

        $timHki->update($data);

        return response()->json(['data' => $this->format($timHki->fresh())]);
    }

    /* Admin: hapus anggota beserta fotonya */
    public function destroy(TimHki $timHki): JsonResponse
    {
        $this->hapus($timHki->foto);

        $timHki->delete();

        return response()->json(['message' => 'Data tim pengelola berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
       Foto: semua jenis gambar, tanpa batas resolusi dan ukuran
       (sama dengan gambar di Informasi)
    ========================================================= */

    private function validasi(Request $request): array
    {
        return $request->validate([
            'jabatan' => ['required', 'string', 'max:255'],
            'nama'    => ['required', 'string', 'max:255'],
            'urutan'  => ['nullable', 'integer', 'min:1', 'max:9999'],
            'foto'    => ['nullable', 'image'],
        ], [
            'jabatan.required' => 'Jabatan / tugas wajib diisi.',
            'nama.required'    => 'Nama wajib diisi.',
            'urutan.integer'   => 'Urutan harus berupa angka.',
            'urutan.min'       => 'Urutan minimal 1.',
            'foto.image'       => 'File foto harus berupa gambar.',
            'foto.uploaded'    => 'Foto gagal diunggah. Ukuran file melebihi batas server (upload_max_filesize).',
        ]);
    }

    /* =========================================================
       FORMAT RESPONSE (path foto diubah menjadi URL lengkap)
    ========================================================= */

    private function format(TimHki $item): array
    {
        return [
            'id'      => $item->id,
            'jabatan' => $item->jabatan,
            'nama'    => $item->nama,
            'urutan'  => $item->urutan,
            'foto'    => $item->foto
                ? asset('storage/' . $item->foto)
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
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StrukturOrganisasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class StrukturOrganisasiController extends Controller
{
    private const FOTO_DIR = 'struktur-organisasi';
    private const FOTO_WIDTH = 1280;
    private const FOTO_HEIGHT = 960;

    /* Publik dan admin: daftar anggota, urut berdasarkan urutan tampil */
    public function index(): JsonResponse
    {
        $items = StrukturOrganisasi::query()
            ->orderBy('urutan')
            ->orderBy('id')
            ->get()
            ->map(fn (StrukturOrganisasi $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu anggota */
    public function show(StrukturOrganisasi $strukturOrganisasi): JsonResponse
    {
        return response()->json(['data' => $this->format($strukturOrganisasi)]);
    }

    /* Admin: tambah anggota */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);
        unset($data['foto']);

        $data['urutan'] = $data['urutan']
            ?? ((int) StrukturOrganisasi::max('urutan') + 1);

        if ($request->hasFile('foto')) {
            $data['foto'] = $this->simpanFoto($request->file('foto'));
        }

        $item = StrukturOrganisasi::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    /* Admin: ubah anggota */
    public function update(Request $request, StrukturOrganisasi $strukturOrganisasi): JsonResponse
    {
        $data = $this->validasi($request);
        unset($data['foto']);

        if (!isset($data['urutan'])) {
            unset($data['urutan']);
        }

        if ($request->hasFile('foto')) {
            $this->hapusFoto($strukturOrganisasi->foto);
            $data['foto'] = $this->simpanFoto($request->file('foto'));
        }

        $strukturOrganisasi->update($data);

        return response()->json(['data' => $this->format($strukturOrganisasi->fresh())]);
    }

    /* Admin: hapus anggota beserta file fotonya */
    public function destroy(StrukturOrganisasi $strukturOrganisasi): JsonResponse
    {
        $this->hapusFoto($strukturOrganisasi->foto);
        $strukturOrganisasi->delete();

        return response()->json(['message' => 'Data anggota berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
    ========================================================= */

    private function validasi(Request $request): array
    {
        return $request->validate([
            'jabatan' => ['required', 'string', 'max:150'],
            'nama'    => ['required', 'string', 'max:255'],
            'urutan'  => ['nullable', 'integer', 'min:1'],
            // Tanpa batas ukuran/resolusi, hanya harus berupa gambar
            'foto'    => ['nullable', 'image'],
        ], [
            'jabatan.required' => 'Jabatan wajib diisi.',
            'nama.required'    => 'Nama lengkap wajib diisi.',
            'urutan.integer'   => 'Urutan harus berupa angka.',
            'urutan.min'       => 'Urutan minimal 1.',
            'foto.image'       => 'File foto harus berupa gambar.',
        ]);
    }

    /* =========================================================
       FORMAT RESPONSE (path foto diubah menjadi URL lengkap)
    ========================================================= */

    private function format(StrukturOrganisasi $item): array
    {
        return [
            'id'      => $item->id,
            'jabatan' => $item->jabatan,
            'nama'    => $item->nama,
            'foto'    => $item->foto
                ? asset('storage/' . $item->foto)
                : null,
            'urutan'  => $item->urutan,
        ];
    }

    /* =========================================================
       FOTO
    ========================================================= */

    private function simpanFoto(UploadedFile $file): string
    {
        $image = (new ImageManager(new Driver()))
            ->read($file->getRealPath())
            ->cover(self::FOTO_WIDTH, self::FOTO_HEIGHT);

        $path = self::FOTO_DIR . '/' . Str::uuid() . '.jpg';

        Storage::disk('public')->put($path, (string) $image->toJpeg(90));

        return $path;
    }

    private function hapusFoto(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
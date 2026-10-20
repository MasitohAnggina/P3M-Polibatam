<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Publikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PublikasiController extends Controller
{
    /**
     * GET /api/publikasi        (publik, tanpa file bukti)
     * GET /api/admin/publikasi  (admin, dengan file bukti)
     */
    public function index(Request $request): JsonResponse
    {
        $publikasi = Publikasi::query()
            ->orderByDesc('year')
            ->orderByDesc('id')
            ->get();

        if (! $request->is('api/admin/*')) {
            $publikasi->each->makeHidden('file_url');
        }

        return response()->json(['data' => $publikasi]);
    }

    /** GET /api/admin/publikasi/{publikasi} */
    public function show(Publikasi $publikasi): JsonResponse
    {
        return response()->json(['data' => $publikasi]);
    }

    /** POST /api/admin/publikasi (multipart/form-data) */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $data['slug'] = Publikasi::makeSlug($data['title']);
        $data['cover_path'] = $request->hasFile('cover')
            ? $request->file('cover')->store('publikasi/cover', 'public')
            : null;
        $data['file_path'] = $request->hasFile('file')
            ? $request->file('file')->store('publikasi/bukti', 'public')
            : null;

        $publikasi = Publikasi::create($data);

        return response()->json(['data' => $publikasi], 201);
    }

    /**
     * PUT /api/admin/publikasi/{publikasi}
     * Dari frontend dikirim sebagai POST + field _method=PUT,
     * karena PHP tidak membaca multipart pada request PUT asli.
     */
    public function update(Request $request, Publikasi $publikasi): JsonResponse
    {
        $data = $this->validated($request);

        if ($data['title'] !== $publikasi->title) {
            $data['slug'] = Publikasi::makeSlug($data['title'], $publikasi->id);
        }

        if ($request->hasFile('cover')) {
            $this->deleteFile($publikasi->cover_path);
            $data['cover_path'] = $request->file('cover')->store('publikasi/cover', 'public');
        }

        if ($request->hasFile('file')) {
            $this->deleteFile($publikasi->file_path);
            $data['file_path'] = $request->file('file')->store('publikasi/bukti', 'public');
        }

        $publikasi->update($data);

        return response()->json(['data' => $publikasi->fresh()]);
    }

    /** DELETE /api/admin/publikasi/{publikasi} */
    public function destroy(Publikasi $publikasi): JsonResponse
    {
        $this->deleteFile($publikasi->cover_path);
        $this->deleteFile($publikasi->file_path);

        $publikasi->delete();

        return response()->json(['message' => 'Publikasi berhasil dihapus.']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title'         => ['required', 'string', 'max:255'],
            'category'      => ['required', Rule::in(Publikasi::KATEGORI)],
            'year'          => ['required', 'integer', 'between:1990,' . (now()->year + 1)],
            'authors'       => ['required', 'string', 'max:2000'],
            'source_name'   => ['required', 'string', 'max:255'],
            'source_detail' => ['nullable', 'string', 'max:255'],
            'indeks'        => ['nullable', 'string', 'max:50'],
            'description'   => ['nullable', 'string', 'max:5000'],
            'href'          => ['nullable', 'url', 'max:500'],
            'cover'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'file'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ], [
            'category.in'  => 'Jenis publikasi tidak valid.',
            'href.url'     => 'Link publikasi harus berupa URL yang valid (diawali http:// atau https://).',
            'cover.max'    => 'Ukuran sampul maksimal 2 MB.',
            'file.max'     => 'Ukuran file bukti maksimal 5 MB.',
            'cover.image'  => 'Sampul harus berupa gambar.',
            'file.mimes'   => 'Format file bukti harus PDF, JPG, atau PNG.',
        ]);

        // objek upload ditangani terpisah (disimpan ke storage), bukan kolom DB
        unset($data['cover'], $data['file']);

        return $data;
    }

    private function deleteFile(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
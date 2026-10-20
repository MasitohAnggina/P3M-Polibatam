<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hki;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class HkiController extends Controller
{
    private const GAMBAR_DIR = 'hki';

    private const JENIS = ['Hak Cipta', 'Paten', 'Paten Sederhana', 'Desain Industri'];

    /* Publik (/api/hki) dan admin (/api/admin/hki): terbaru di atas */
    public function index(): JsonResponse
    {
        $items = Hki::query()
            ->orderByDesc('tahun')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Hki $item) => $this->format($item));

        return response()->json(['data' => $items]);
    }

    public function show(Hki $hki): JsonResponse
    {
        return response()->json(['data' => $this->format($hki)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);
        $data = $this->rapikan($request, $data);

        $data['gambar'] = $request->hasFile('gambar')
            ? $this->simpanGambar($request->file('gambar'))
            : null;

        $item = Hki::create($data);

        return response()->json(['data' => $this->format($item)], 201);
    }

    public function update(Request $request, Hki $hki): JsonResponse
    {
        $data = $this->validasi($request, $hki);
        $data = $this->rapikan($request, $data);

        if ($request->hasFile('gambar')) {
            $this->hapusGambar($hki->gambar);
            $data['gambar'] = $this->simpanGambar($request->file('gambar'));
        } elseif ($request->boolean('hapus_gambar')) {
            $this->hapusGambar($hki->gambar);
            $data['gambar'] = null;
        } else {
            unset($data['gambar']); // gambar lama dipertahankan
        }

        $hki->update($data);

        return response()->json(['data' => $this->format($hki->fresh())]);
    }

    public function destroy(Hki $hki): JsonResponse
    {
        $this->hapusGambar($hki->gambar);
        $hki->delete();

        return response()->json(['message' => 'Data HKI berhasil dihapus.']);
    }

    /* ========================= VALIDASI ========================= */

    private function validasi(Request $request, ?Hki $hki = null): array
    {
        return $request->validate([
            'jenis'            => ['required', Rule::in(self::JENIS)],
            'kategori'         => ['nullable', 'string', 'max:255'],
            'judul'            => ['required', 'string', 'max:500'],
            'inventor'         => ['required', 'array', 'min:1'],
            'inventor.*'       => ['string', 'max:255'],
            'nomor_permohonan' => [
                'required', 'string', 'max:100',
                Rule::unique('hki', 'nomor_permohonan')->ignore($hki?->id),
            ],
            'tahun'            => ['required', 'digits:4'],
            'gambar'           => ['nullable', 'image', 'max:5120'],
        ], [
            'jenis.required'            => 'Jenis HKI wajib dipilih.',
            'jenis.in'                  => 'Jenis HKI tidak valid.',
            'judul.required'            => 'Judul HKI wajib diisi.',
            'inventor.required'         => 'Inventor / pencipta wajib diisi.',
            'inventor.min'              => 'Minimal satu inventor / pencipta.',
            'nomor_permohonan.required' => 'Nomor permohonan wajib diisi.',
            'nomor_permohonan.unique'   => 'Nomor permohonan sudah terdaftar.',
            'tahun.required'            => 'Tahun wajib diisi.',
            'tahun.digits'              => 'Tahun harus 4 digit angka.',
            'gambar.image'              => 'File foto harus berupa gambar.',
            'gambar.max'                => 'Ukuran foto maksimal 5 MB.',
            'gambar.uploaded'           => 'Foto gagal diunggah. Ukuran file melebihi batas server (upload_max_filesize).',
        ]);
    }

    /* Rapikan daftar inventor: buang yang kosong, trim spasi */
    private function rapikan(Request $request, array $data): array
    {
        $data['inventor'] = array_values(array_filter(
            array_map(
                fn ($v) => is_string($v) ? trim($v) : '',
                (array) $request->input('inventor', [])
            ),
            fn ($v) => $v !== ''
        ));

        return $data;
    }

    /* ========================= FORMAT ========================= */

    private function format(Hki $item): array
    {
        return [
            'id'               => $item->id,
            'jenis'            => $item->jenis,
            'kategori'         => $item->kategori,
            'judul'            => $item->judul,
            'inventor'         => $item->inventor ?? [],
            'nomor_permohonan' => $item->nomor_permohonan,
            'tahun'            => $item->tahun,
            'gambar'           => $item->gambar
                ? asset('storage/' . $item->gambar)
                : null,
        ];
    }

    /* ========================= GAMBAR ========================= */

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
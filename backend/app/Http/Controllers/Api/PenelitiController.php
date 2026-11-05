<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Peneliti;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class PenelitiController extends Controller
{
    private const FOTO_DIR = 'peneliti';

    /* Foto potret rasio 4:5, sama dengan halaman admin dan publik.
       Tidak ada batas ukuran file atau resolusi saat upload; foto
       dipotong dan disesuaikan ke ukuran ini saat disimpan. */
    private const FOTO_WIDTH = 800;
    private const FOTO_HEIGHT = 1000;

    /* Halaman publik hanya memakai: foto, nama, prodi, dan tautan
       profil SINTA. Kolom lain (jabatan, jurusan, lab, keahlian,
       NIDN, email, dst.) tidak lagi dikelola dari form admin, tapi
       datanya tetap disimpan dan tidak dihapus. */

    /* Publik dan admin: daftar peneliti, urut nama */
    public function index(Request $request): JsonResponse
    {
        // Admin (login Sanctum) menerima data lengkap supaya form bisa
        // mengirim ulang data lama. Publik hanya menerima yang dipakai
        // halaman, jadi email dan NIDN tidak ikut terbuka.
        $lengkap = $request->user('sanctum') !== null;

        $items = Peneliti::query()
            ->orderBy('nama')
            ->orderBy('id')
            ->get()
            ->map(fn (Peneliti $item) => $lengkap
                ? $this->formatLengkap($item)
                : $this->formatPublik($item));

        return response()->json(['data' => $items]);
    }

    /* Admin: detail satu peneliti */
    public function show(Peneliti $peneliti): JsonResponse
    {
        return response()->json(['data' => $this->formatLengkap($peneliti)]);
    }

    /* Admin: tambah peneliti */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);
        unset($data['foto'], $data['hapus_foto']);

        // Tautan yang tidak dikirim berarti tidak ada tautan
        $data['tautan'] = array_values($data['tautan'] ?? []);

        if ($request->hasFile('foto')) {
            $data['foto'] = $this->simpanFoto($request->file('foto'));
        }

        $item = Peneliti::create($data);

        return response()->json(['data' => $this->formatLengkap($item)], 201);
    }

    /* Admin: ubah peneliti (frontend: POST + _method=PUT) */
    public function update(Request $request, Peneliti $peneliti): JsonResponse
    {
        $data = $this->validasi($request);
        unset($data['foto'], $data['hapus_foto']);

        // Hanya tautan yang dikelola form: kalau tidak dikirim, berarti
        // semua tautan dihapus. Kolom lain yang tidak dikirim dibiarkan
        // seperti sebelumnya (tidak dikosongkan).
        $data['tautan'] = array_values($data['tautan'] ?? []);

        $fotoLama = $peneliti->foto;
        $hapusFotoLama = false;

        if ($request->hasFile('foto')) {
            $data['foto'] = $this->simpanFoto($request->file('foto'));
            $hapusFotoLama = true;
        } elseif ($request->boolean('hapus_foto')) {
            $data['foto'] = null;
            $hapusFotoLama = true;
        }

        $peneliti->update($data);

        // Foto lama baru dihapus setelah data berhasil diperbarui
        if ($hapusFotoLama) {
            $this->hapusFoto($fotoLama);
        }

        return response()->json(['data' => $this->formatLengkap($peneliti->fresh())]);
    }

    /* Admin: hapus peneliti beserta file fotonya */
    public function destroy(Peneliti $peneliti): JsonResponse
    {
        $this->hapusFoto($peneliti->foto);
        $peneliti->delete();

        return response()->json(['message' => 'Data peneliti berhasil dihapus.']);
    }

    /* =========================================================
       VALIDASI
       Wajib: nama dan prodi. Semua kolom lain opsional.
    ========================================================= */

    private function validasi(Request $request): array
    {
        return $request->validate([
            'nama'         => ['required', 'string', 'max:255'],
            'prodi'        => ['required', 'string', 'max:150'],

            // Tidak lagi diisi dari form; boleh kosong
            'jabatan'      => ['nullable', 'string', 'max:100'],
            'jurusan'      => ['nullable', 'string', 'max:150'],
            'laboratorium' => ['nullable', 'string', 'max:255'],
            'nidn'         => ['nullable', 'string', 'max:30'],
            'email'        => ['nullable', 'email', 'max:255'],
            'tentang'      => ['nullable', 'string'],

            // Tanpa batas ukuran/resolusi, hanya harus berupa gambar
            'foto'       => ['nullable', 'image'],
            'hapus_foto' => ['nullable', 'boolean'],

            'keahlian'   => ['nullable', 'array'],
            'keahlian.*' => ['string', 'max:100'],

            'pendidikan'              => ['nullable', 'array'],
            'pendidikan.*.jenjang'    => ['required', 'string', 'max:50'],
            'pendidikan.*.bidang'     => ['nullable', 'string', 'max:255'],
            'pendidikan.*.institusi'  => ['required', 'string', 'max:255'],
            'pendidikan.*.tahun'      => ['nullable', 'digits:4'],

            'luaran'            => ['nullable', 'array'],
            'luaran.*.judul'    => ['required', 'string', 'max:500'],
            'luaran.*.penulis'  => ['nullable', 'string', 'max:500'],
            'luaran.*.penerbit' => ['nullable', 'string', 'max:500'],
            'luaran.*.tahun'    => ['nullable', 'digits:4'],
            'luaran.*.jenis'    => ['nullable', 'in:Artikel Jurnal,Prosiding,HKI,Buku'],

            'tautan'         => ['nullable', 'array'],
            'tautan.*.label' => ['required', 'string', 'max:100'],
            'tautan.*.url'   => ['required', 'url', 'max:500'],
        ], [
            'nama.required'  => 'Nama lengkap wajib diisi.',
            'prodi.required' => 'Program studi wajib diisi.',
            'email.email'    => 'Format email tidak valid.',

            'foto.image' => 'File foto harus berupa gambar.',

            'pendidikan.*.jenjang.required'   => 'Pendidikan: jenjang wajib diisi.',
            'pendidikan.*.institusi.required' => 'Pendidikan: institusi wajib diisi.',
            'pendidikan.*.tahun.digits'       => 'Pendidikan: tahun harus 4 digit angka.',

            'luaran.*.judul.required' => 'Luaran penelitian: judul wajib diisi.',
            'luaran.*.tahun.digits'   => 'Luaran penelitian: tahun harus 4 digit angka.',
            'luaran.*.jenis.in'       => 'Luaran penelitian: jenis tidak valid.',

            'tautan.*.label.required' => 'Tautan profil: nama wajib diisi.',
            'tautan.*.url.required'   => 'Tautan profil: alamat tautan wajib diisi.',
            'tautan.*.url.url'        => 'Tautan profil: alamat harus diawali http:// atau https://',
        ]);
    }

    /* =========================================================
       FORMAT RESPONSE (path foto diubah menjadi URL lengkap)
    ========================================================= */

    private function urlFoto(Peneliti $item): ?string
    {
        return $item->foto ? asset('storage/' . $item->foto) : null;
    }

    /* Publik: hanya yang tampil di halaman Profil Peneliti */
    private function formatPublik(Peneliti $item): array
    {
        return [
            'id'     => $item->id,
            'nama'   => $item->nama,
            'prodi'  => $item->prodi,
            'foto'   => $this->urlFoto($item),
            'tautan' => $item->tautan ?? [],
        ];
    }

    /* Admin: data lengkap (termasuk data lama yang tidak ditampilkan) */
    private function formatLengkap(Peneliti $item): array
    {
        return [
            'id'           => $item->id,
            'nama'         => $item->nama,
            'jabatan'      => $item->jabatan,
            'nidn'         => $item->nidn,
            'email'        => $item->email,
            'jurusan'      => $item->jurusan,
            'prodi'        => $item->prodi,
            'laboratorium' => $item->laboratorium,
            'foto'         => $this->urlFoto($item),
            'tentang'      => $item->tentang,
            'keahlian'     => $item->keahlian ?? [],
            'pendidikan'   => $item->pendidikan ?? [],
            'luaran'       => $item->luaran ?? [],
            'tautan'       => $item->tautan ?? [],
        ];
    }

    /* =========================================================
       FOTO (dipotong ke rasio 4:5 lalu disimpan sebagai JPG)
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
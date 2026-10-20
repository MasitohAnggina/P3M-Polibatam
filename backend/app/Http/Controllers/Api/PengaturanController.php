<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengaturan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PengaturanController extends Controller
{
    /** PUT /api/admin/pengaturan/profil */
    public function updateProfil(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ], [
            'email.unique' => 'Email sudah dipakai akun lain.',
            'email.email' => 'Format email belum benar.',
        ]);

        $user->update($data);

        return response()->json([
            'message' => 'Profil berhasil disimpan.',
            'data' => ['name' => $user->name, 'email' => $user->email],
        ]);
    }

    /** PUT /api/admin/pengaturan/password */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'password_lama' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak sama.',
        ]);

        if (! Hash::check($data['password_lama'], $user->password)) {
            throw ValidationException::withMessages([
                'password_lama' => 'Kata sandi lama salah.',
            ]);
        }

        // Kolom password di model User sudah di-cast 'hashed' (Laravel 11).
        // Kalau project kamu memakai Laravel 10, ganti jadi Hash::make($data['password']).
        $user->update(['password' => $data['password']]);

        // Keluarkan perangkat lain, token yang sedang dipakai tetap aktif.
        $current = $user->currentAccessToken();
        $query = $user->tokens();
        if ($current && isset($current->id)) {
            $query->where('id', '!=', $current->id);
        }
        $query->delete();

        return response()->json(['message' => 'Kata sandi berhasil diganti.']);
    }

    /** GET /api/kontak (publik) dan GET /api/admin/pengaturan/kontak */
    public function kontak(): JsonResponse
    {
        return response()->json(['data' => $this->formatKontak(Pengaturan::tunggal())]);
    }

    /** PUT /api/admin/pengaturan/kontak */
    public function updateKontak(Request $request): JsonResponse
    {
        $data = $request->validate([
            'alamat' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:50'],
        ], [
            'email.email' => 'Format email belum benar.',
        ]);

        $pengaturan = Pengaturan::tunggal();
        $pengaturan->update([
            'kontak_alamat' => $data['alamat'] ?? null,
            'kontak_email' => $data['email'] ?? null,
            'kontak_telepon' => $data['telepon'] ?? null,
        ]);

        return response()->json([
            'message' => 'Kontak berhasil disimpan.',
            'data' => $this->formatKontak($pengaturan->fresh()),
        ]);
    }

    /** Bentuk respons tetap alamat/email/telepon, sesuai yang dibaca frontend. */
    private function formatKontak(Pengaturan $p): array
    {
        return [
            'alamat' => $p->kontak_alamat ?? '',
            'email' => $p->kontak_email ?? '',
            'telepon' => $p->kontak_telepon ?? '',
        ];
    }
}
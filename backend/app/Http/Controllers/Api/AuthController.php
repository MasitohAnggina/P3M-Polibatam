<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(
            [
                'email'    => ['required', 'email'],
                'password' => ['required', 'string'],
                'remember' => ['sometimes', 'boolean'],
            ],
            [
                'email.required'    => 'Email wajib diisi.',
                'email.email'       => 'Format email tidak valid.',
                'password.required' => 'Password wajib diisi.',
            ]
        );

        $user = User::where('email', Str::lower($credentials['email']))->first();

        // Hash::check tetap dijalankan walau user tidak ditemukan,
        // supaya waktu respons sama dan email yang terdaftar tidak bisa ditebak.
        $passwordHash = $user?->password ?? Hash::make(Str::random(16));
        $isValid = Hash::check($credentials['password'], $passwordHash);

        if (! $user || ! $isValid) {
            return response()->json([
                'message' => 'Email atau password tidak sesuai.',
            ], 401);
        }

        $remember  = (bool) ($credentials['remember'] ?? false);
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(12);

        $token = $user->createToken('p3m-admin', ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'message'    => 'Login berhasil.',
            'user'       => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'token'      => $token,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }
}
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PenelitiController;
use App\Http\Controllers\Api\PenelitianController;
use App\Http\Controllers\Api\PengabdianController;
use App\Http\Controllers\Api\PublikasiController;
use App\Http\Controllers\Api\StrukturOrganisasiController;
use App\Http\Controllers\Api\InformasiController;
use App\Http\Controllers\Api\DokumenController;
use App\Http\Controllers\Api\TimHkiController;
use App\Http\Controllers\Api\HkiController;
use App\Http\Controllers\Api\PengaturanController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InfografisController;
use App\Http\Controllers\Api\PencarianController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Publik
Route::get('/struktur-organisasi', [StrukturOrganisasiController::class, 'index']);
Route::get('/peneliti', [PenelitiController::class, 'index']);
Route::get('/penelitian', [PenelitianController::class, 'index']);
Route::get('/pengabdian', [PengabdianController::class, 'index']);
Route::get('/publikasi', [PublikasiController::class, 'index']);
Route::get('/informasi', [InformasiController::class, 'index']);
Route::get('/dokumen', [DokumenController::class, 'index']);
Route::get('/tim-hki', [TimHkiController::class, 'index']);
Route::get('/hki', [HkiController::class, 'index']);
Route::get('/kontak', [PengaturanController::class, 'kontak']);
Route::get('/pencarian', [PencarianController::class, 'index'])
    ->middleware('throttle:60,1');
Route::get('/infografis', [InfografisController::class, 'index']);
Route::get('/statistik', [InfografisController::class, 'ringkasan']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin
    Route::prefix('admin')->group(function () {
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);
        // Struktur Organisasi
        Route::get('/struktur-organisasi', [StrukturOrganisasiController::class, 'index']);
        Route::get('/struktur-organisasi/{strukturOrganisasi}', [StrukturOrganisasiController::class, 'show']);
        Route::post('/struktur-organisasi', [StrukturOrganisasiController::class, 'store']);
        Route::put('/struktur-organisasi/{strukturOrganisasi}', [StrukturOrganisasiController::class, 'update']);
        Route::delete('/struktur-organisasi/{strukturOrganisasi}', [StrukturOrganisasiController::class, 'destroy']);

        // Profil Peneliti
        Route::get('/peneliti', [PenelitiController::class, 'index']);
        Route::get('/peneliti/{peneliti}', [PenelitiController::class, 'show']);
        Route::post('/peneliti', [PenelitiController::class, 'store']);
        Route::put('/peneliti/{peneliti}', [PenelitiController::class, 'update']);
        Route::delete('/peneliti/{peneliti}', [PenelitiController::class, 'destroy']);

        // Penelitian
        Route::get('/penelitian', [PenelitianController::class, 'index']);
        Route::get('/penelitian/{penelitian}', [PenelitianController::class, 'show']);
        Route::post('/penelitian', [PenelitianController::class, 'store']);
        Route::put('/penelitian/{penelitian}', [PenelitianController::class, 'update']);
        Route::delete('/penelitian/{penelitian}', [PenelitianController::class, 'destroy']);

        // Pengabdian
        Route::get('/pengabdian', [PengabdianController::class, 'index']);
        Route::get('/pengabdian/{pengabdian}', [PengabdianController::class, 'show']);
        Route::post('/pengabdian', [PengabdianController::class, 'store']);
        Route::put('/pengabdian/{pengabdian}', [PengabdianController::class, 'update']);
        Route::delete('/pengabdian/{pengabdian}', [PengabdianController::class, 'destroy']);

        // Publikasi
        Route::get('/publikasi', [PublikasiController::class, 'index']);
        Route::get('/publikasi/{publikasi}', [PublikasiController::class, 'show']);
        Route::post('/publikasi', [PublikasiController::class, 'store']);
        Route::put('/publikasi/{publikasi}', [PublikasiController::class, 'update']);
        Route::delete('/publikasi/{publikasi}', [PublikasiController::class, 'destroy']);

        // Informasi
        Route::get('/informasi', [InformasiController::class, 'index']);
        Route::get('/informasi/{informasi}', [InformasiController::class, 'show']);
        Route::post('/informasi', [InformasiController::class, 'store']);
        Route::put('/informasi/{informasi}', [InformasiController::class, 'update']);
        Route::delete('/informasi/{informasi}', [InformasiController::class, 'destroy']);

        // Dokumen & Panduan
        Route::get('/dokumen', [DokumenController::class, 'index']);
        Route::get('/dokumen/{dokumen}', [DokumenController::class, 'show']);
        Route::post('/dokumen', [DokumenController::class, 'store']);
        Route::put('/dokumen/{dokumen}', [DokumenController::class, 'update']);
        Route::delete('/dokumen/{dokumen}', [DokumenController::class, 'destroy']);

        // Tim Pengelola HKI
        Route::get('/tim-hki', [TimHkiController::class, 'index']);
        Route::get('/tim-hki/{timHki}', [TimHkiController::class, 'show']);
        Route::post('/tim-hki', [TimHkiController::class, 'store']);
        Route::put('/tim-hki/{timHki}', [TimHkiController::class, 'update']);
        Route::delete('/tim-hki/{timHki}', [TimHkiController::class, 'destroy']);

                // Data HKI
        Route::get('/hki', [HkiController::class, 'index']);
        Route::get('/hki/{hki}', [HkiController::class, 'show']);
        Route::post('/hki', [HkiController::class, 'store']);
        Route::put('/hki/{hki}', [HkiController::class, 'update']);
        Route::delete('/hki/{hki}', [HkiController::class, 'destroy']);

        // Pengaturan
        Route::prefix('pengaturan')->group(function () {
            Route::put('/profil', [PengaturanController::class, 'updateProfil']);
            Route::put('/password', [PengaturanController::class, 'updatePassword']);
            Route::get('/kontak', [PengaturanController::class, 'kontak']);
            Route::put('/kontak', [PengaturanController::class, 'updateKontak']);
        });
    });
});
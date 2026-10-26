<?php

namespace App\Console\Commands;

use App\Models\Pengabdian;
use App\Models\Penelitian;
use App\Models\Peneliti;
use App\Models\TerjemahanInfografis;
use Illuminate\Console\Command;

class SinkronTerjemahanInfografis extends Command
{
    protected $signature = 'infografis:terjemahan';

    protected $description = 'Daftarkan nama prodi, jurusan, dan jenis program ke tabel terjemahan';

    public function handle(): int
    {
        $sumber = [
            'prodi'              => Peneliti::query()->pluck('prodi'),
            'jurusan'            => Peneliti::query()->pluck('jurusan'),
            'program_penelitian' => Penelitian::query()->pluck('program'),
            'jenis_pengabdian'   => Pengabdian::query()->pluck('program'),
        ];

        foreach ($sumber as $jenis => $daftar) {
            $daftar
                ->map(fn ($nama) => trim((string) $nama))
                ->filter()
                ->unique()
                ->each(fn ($nama) => TerjemahanInfografis::firstOrCreate([
                    'jenis' => $jenis,
                    'nama'  => $nama,
                ]));
        }

        $kosong = TerjemahanInfografis::query()
            ->where(fn ($q) => $q->whereNull('nama_en')->orWhere('nama_en', ''))
            ->orderBy('jenis')
            ->orderBy('nama')
            ->get(['jenis', 'nama']);

        if ($kosong->isEmpty()) {
            $this->info('Semua nama sudah punya terjemahan.');

            return self::SUCCESS;
        }

        $this->warn("Belum ada nama Inggris untuk {$kosong->count()} nama:");
        $this->table(['Jenis', 'Nama'], $kosong->map(fn ($r) => [$r->jenis, $r->nama])->all());

        return self::SUCCESS;
    }
}
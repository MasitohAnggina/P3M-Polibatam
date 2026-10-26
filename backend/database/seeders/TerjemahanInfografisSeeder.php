<?php

namespace Database\Seeders;

use App\Models\TerjemahanInfografis;
use Illuminate\Database\Seeder;

class TerjemahanInfografisSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            /* jenis pengabdian */
            ['jenis_pengabdian', 'Pengabdian CSR', 'CSR Community Service'],
            ['jenis_pengabdian', 'Penugasan Polibatam', 'Polibatam Assignment'],

            /* jurusan */
            ['jurusan', 'Manajemen Bisnis', 'Business Management'],
            ['jurusan', 'Teknik Elektro', 'Electrical Engineering'],
            ['jurusan', 'Teknik Informatika', 'Informatics Engineering'],
            ['jurusan', 'Teknik Mesin', 'Mechanical Engineering'],

            /* program studi */
            ['prodi', 'Akuntansi', 'Accounting'],
            ['prodi', 'Akuntansi Manajerial', 'Managerial Accounting'],
            ['prodi', 'Teknik Informatika', 'Informatics Engineering'],
            ['prodi', 'Teknik Mesin', 'Mechanical Engineering'],
            ['prodi', 'Teknologi Rekayasa Pembangkit Energi', 'Energy Generation Engineering Technology'],

            /* program penelitian */
            ['program_penelitian', 'Penelitian BIMA', 'BIMA Research'],
            ['program_penelitian', 'Penelitian Pemerintah Daerah', 'Regional Government Research'],
        ];

        foreach ($data as [$jenis, $nama, $en]) {
            TerjemahanInfografis::updateOrCreate(
                ['jenis' => $jenis, 'nama' => $nama],
                ['nama_en' => $en],
            );
        }
    }
}
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SeguridadInicialSeeder::class,
            AdministradorInicialSeeder::class,
            ProductosInicialSeeder::class,
            ClientesInicialSeeder::class,
        ]);
    }
}
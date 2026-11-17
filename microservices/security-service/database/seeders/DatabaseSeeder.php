<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SeguridadInicialSeeder::class,
            ClientesPermisosSeeder::class,
            CatalogoPermisosSeeder::class,
            VentasPermisosSeeder::class,
            PedidosPermisosSeeder::class,
            AdministradorInicialSeeder::class,
            InventoryPermisosSeeder::class,
        ]);
    }
}

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
            DashboardPermisosSeeder::class,
            AdministradorInicialSeeder::class,
            Sprint4PermisosSeeder::class,
            InventoryPermisosSeeder::class,
            ProductionPermisosSeeder::class,
            ReportesPermisosSeeder::class,
        ]);
    }
}

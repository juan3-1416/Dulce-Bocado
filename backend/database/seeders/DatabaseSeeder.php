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
            RecetasInicialSeeder::class,
            VentasInicialSeeder::class,
            PagosInicialSeeder::class,
            PagosInternetInicialSeeder::class,
            RecibosInicialSeeder::class,
            PedidosInicialSeeder::class,
            PedidosEstadoInicialSeeder::class,
            ProduccionSeeder::class,
            AlmacenSeeder::class,
            InventarioPermissionSeeder::class,
            IngresoPermissionSeeder::class,
        ]);
    }
}
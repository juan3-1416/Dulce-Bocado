$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot

try {
    Write-Host ""
    Write-Host "========================================="
    Write-Host " DULCE BOCADO - POBLACION DEMO COMPLETA"
    Write-Host "========================================="
    Write-Host ""

    $composeFiles = @(
        "docker-compose.yml",
        "docker-compose.sprint1.yml",
        "docker-compose.sprint2.catalog.yml",
        "docker-compose.sprint2.customer.yml",
        "docker-compose.sprint2.order.yml",
        "docker-compose.sprint2.sales.yml",
        "docker-compose.sprint3.inventory.yml",
        "docker-compose.sprint3.production.yml",
        "docker-compose.sprint4.payment.yml"
    )

    foreach ($file in $composeFiles) {
        if (-not (Test-Path $file)) {
            throw "No se encontro el archivo Compose: $file"
        }
    }

    $composeArgs = @()

    foreach ($file in $composeFiles) {
        $composeArgs += "-f"
        $composeArgs += $file
    }

    function Invoke-DemoSeeder {
        param(
            [Parameter(Mandatory = $true)]
            [string] $Service,

            [Parameter(Mandatory = $true)]
            [string] $Seeder,

            [Parameter(Mandatory = $true)]
            [string] $Nombre
        )

        Write-Host ""
        Write-Host "-----------------------------------------"
        Write-Host " $Nombre"
        Write-Host " Servicio: $Service"
        Write-Host " Seeder:   $Seeder"
        Write-Host "-----------------------------------------"

        & docker compose @composeArgs exec -T `
            $Service `
            php artisan db:seed `
            "--class=$Seeder" `
            --force

        if ($LASTEXITCODE -ne 0) {
            throw "Fallo el seeder $Seeder en $Service."
        }

        Write-Host "[OK] $Nombre"
    }

    #
    # Orden de dependencias
    #

    Invoke-DemoSeeder `
        -Service "catalog-service" `
        -Seeder "Database\Seeders\CatalogDemoSeeder" `
        -Nombre "1/8 Catalogo"

    Invoke-DemoSeeder `
        -Service "customer-service" `
        -Seeder "Database\Seeders\CustomerDemoSeeder" `
        -Nombre "2/8 Clientes"

    Invoke-DemoSeeder `
        -Service "inventory-service" `
        -Seeder "Database\Seeders\InventoryDemoSeeder" `
        -Nombre "3/8 Inventario"

    Invoke-DemoSeeder `
        -Service "production-service" `
        -Seeder "Database\Seeders\ProductionDemoSeeder" `
        -Nombre "4/8 Produccion"

    Invoke-DemoSeeder `
        -Service "sales-service" `
        -Seeder "Database\Seeders\SalesDemoSeeder" `
        -Nombre "5/8 Ventas"

    Invoke-DemoSeeder `
        -Service "order-service" `
        -Seeder "Database\Seeders\OrderDemoSeeder" `
        -Nombre "6/8 Pedidos"

    Invoke-DemoSeeder `
        -Service "payment-service" `
        -Seeder "Database\Seeders\PaymentDemoSeeder" `
        -Nombre "7/8 Pagos y recibos"

    Invoke-DemoSeeder `
        -Service "backend" `
        -Seeder "Database\Seeders\DashboardDemo2026Seeder" `
        -Nombre "8/8 Dashboard legacy"

    Write-Host ""
    Write-Host "========================================="
    Write-Host " VALIDACION RAPIDA DEL DASHBOARD"
    Write-Host "========================================="

    & docker compose @composeArgs exec -T backend `
        php artisan tinker `
        --execute="dump([
            'ventas_demo_dashboard' => DB::table('venta')
                ->where('observaciones','like','DASHBOARD_DEMO_2026%')
                ->count(),

            'ventas_noviembre' => DB::table('venta')
                ->where('estado','!=','ANULADA')
                ->whereBetween('fecha_venta',[
                    '2026-11-01 00:00:00',
                    '2026-11-30 23:59:59'
                ])
                ->count(),

            'pedidos_demo_dashboard' => DB::table('pedido')
                ->where('observaciones','like','DASHBOARD_DEMO_2026%')
                ->count(),

            'producciones_demo_dashboard' => DB::table('produccion')
                ->where('observaciones','like','DASHBOARD_DEMO_2026%')
                ->count(),

            'stock_critico' => DB::table('inventario')
                ->where('cantidad','<=',5)
                ->count()
        ]);"

    if ($LASTEXITCODE -ne 0) {
        throw "Fallo la validacion final del Dashboard."
    }

    Write-Host ""
    Write-Host "========================================="
    Write-Host " POBLACION DEMO COMPLETADA CORRECTAMENTE"
    Write-Host "========================================="
    Write-Host ""
}
finally {
    Pop-Location
}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">

    <title>{{ $reporte['titulo'] }}</title>

    <style>
        @page {
            margin: 25px 30px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #334155;
        }

        h1 {
            color: #be185d;
            font-size: 22px;
            margin: 0 0 4px 0;
        }

        .subtitulo {
            color: #64748b;
            margin-bottom: 20px;
        }

        .seccion {
            margin-top: 18px;
        }

        .titulo-seccion {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 7px;
        }

        .resumen {
            width: 100%;
            margin-bottom: 10px;
        }

        .resumen td {
            padding: 7px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        .resumen .nombre {
            font-size: 8px;
            text-transform: uppercase;
            color: #64748b;
        }

        .resumen .valor {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
        }

        table.datos {
            border-collapse: collapse;
            width: 100%;
        }

        table.datos th {
            background: #be185d;
            color: white;
            border: 1px solid #9d174d;
            padding: 6px;
            font-size: 9px;
            text-align: left;
        }

        table.datos td {
            border: 1px solid #cbd5e1;
            padding: 5px;
            vertical-align: top;
        }

        table.datos tr:nth-child(even) {
            background: #f8fafc;
        }

        .derecha {
            text-align: right;
        }

        .estado-critico {
            color: #b91c1c;
            font-weight: bold;
        }

        .sin-datos {
            padding: 20px;
            text-align: center;
            border: 1px solid #cbd5e1;
            color: #64748b;
        }

        .pie {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #cbd5e1;
            font-size: 8px;
            color: #64748b;
        }
    </style>
</head>

<body>

<h1>Dulce Bocado</h1>

<div class="subtitulo">
    {{ $reporte['titulo'] }}
    — Generado el {{ now()->format('d/m/Y H:i') }}
</div>

<div class="seccion">
    <div class="titulo-seccion">Resumen</div>

    <table class="resumen">
        <tr>
            @foreach ($reporte['resumen'] as $nombre => $valor)
                <td>
                    <div class="nombre">
                        {{ str_replace('_', ' ', $nombre) }}
                    </div>

                    <div class="valor">
                        {{ is_bool($valor) ? ($valor ? 'Sí' : 'No') : $valor }}
                    </div>
                </td>
            @endforeach
        </tr>
    </table>
</div>

<div class="seccion">
    <div class="titulo-seccion">Filtros aplicados</div>

    <table class="resumen">
        <tr>
            @foreach ($reporte['filtros'] as $nombre => $valor)
                <td>
                    <div class="nombre">
                        {{ str_replace('_', ' ', $nombre) }}
                    </div>

                    <div class="valor">
                        {{ $valor !== null && $valor !== '' ? $valor : 'Todos' }}
                    </div>
                </td>
            @endforeach
        </tr>
    </table>
</div>

<div class="seccion">

    <div class="titulo-seccion">
        Resultados
    </div>

    @if (count($reporte['datos']) === 0)

        <div class="sin-datos">
            No existen datos para los parámetros seleccionados.
        </div>

    @elseif ($reporte['tipo'] === 'ventas')

        <table class="datos">
            <thead>
            <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th class="derecha">Total Bs</th>
            </tr>
            </thead>

            <tbody>
            @foreach ($reporte['datos'] as $venta)
                <tr>
                    <td>{{ $venta['id_venta'] }}</td>
                    <td>{{ $venta['fecha_venta'] }}</td>
                    <td>{{ $venta['cliente'] }}</td>
                    <td>{{ $venta['vendedor'] }}</td>
                    <td>{{ $venta['estado'] }}</td>
                    <td class="derecha">
                        {{ number_format($venta['total'], 2, ',', '.') }}
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>

    @elseif ($reporte['tipo'] === 'pedidos')

        <table class="datos">
            <thead>
            <tr>
                <th>ID</th>
                <th>Fecha pedido</th>
                <th>Entrega</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th class="derecha">Total Bs</th>
                <th class="derecha">Pagado Bs</th>
                <th class="derecha">Saldo Bs</th>
            </tr>
            </thead>

            <tbody>
            @foreach ($reporte['datos'] as $pedido)
                <tr>
                    <td>{{ $pedido['id_pedido'] }}</td>
                    <td>{{ $pedido['fecha_pedido'] }}</td>
                    <td>
                        {{ $pedido['fecha_entrega'] }}
                        {{ $pedido['hora_entrega'] }}
                    </td>
                    <td>{{ $pedido['cliente'] }}</td>
                    <td>{{ $pedido['estado'] }}</td>

                    <td class="derecha">
                        {{ number_format($pedido['total'], 2, ',', '.') }}
                    </td>

                    <td class="derecha">
                        {{ number_format($pedido['total_pagado'], 2, ',', '.') }}
                    </td>

                    <td class="derecha">
                        {{ number_format($pedido['saldo'], 2, ',', '.') }}
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>

    @elseif ($reporte['tipo'] === 'inventario')

        <table class="datos">
            <thead>
            <tr>
                <th>Almacén</th>
                <th>Tipo</th>
                <th>Ítem</th>
                <th>Presentación</th>
                <th>Unidad</th>
                <th class="derecha">Cantidad</th>
                <th>Estado</th>
            </tr>
            </thead>

            <tbody>
            @foreach ($reporte['datos'] as $item)
                <tr>
                    <td>{{ $item['almacen'] }}</td>
                    <td>
                        {{ $item['tipo'] === 'materia_prima' ? 'Materia prima' : 'Producto' }}
                    </td>
                    <td>{{ $item['nombre'] }}</td>
                    <td>{{ $item['presentacion'] ?? '-' }}</td>
                    <td>{{ $item['unidad_medida'] }}</td>

                    <td class="derecha">
                        {{ number_format($item['cantidad'], 3, ',', '.') }}
                    </td>

                    <td class="{{ $item['stock_critico'] ? 'estado-critico' : '' }}">
                        {{ $item['stock_critico'] ? 'Stock crítico' : 'Normal' }}
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>

    @endif

</div>

<div class="pie">
    Sistema de Información Web Dulce Bocado —
    Reporte generado automáticamente por el sistema.
</div>

</body>
</html>
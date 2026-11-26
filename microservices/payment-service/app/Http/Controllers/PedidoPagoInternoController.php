<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use Illuminate\Http\JsonResponse;

class PedidoPagoInternoController extends Controller
{
    public function show(int $pedido): JsonResponse
    {
        abort_if($pedido < 1, 404);

        $pagos = Pago::query()
            ->where('origen_tipo', 'PEDIDO')
            ->where('origen_id', $pedido)
            ->where('estado', 'CONFIRMADO')
            ->get(['monto']);

        $totalPagado = $pagos->reduce(
            fn (string $total, Pago $pago): string =>
                bcadd($total, (string) $pago->monto, 2),
            '0.00'
        );

        return response()->json([
            'pedido_id' => $pedido,
            'tiene_pago_confirmado' => $pagos->isNotEmpty(),
            'cantidad_pagos_confirmados' => $pagos->count(),
            'total_pagado' => $totalPagado,
        ]);
    }
}
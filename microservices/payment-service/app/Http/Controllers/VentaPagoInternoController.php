<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use Illuminate\Http\JsonResponse;

class VentaPagoInternoController extends Controller
{
    public function show(int $venta): JsonResponse
    {
        if ($venta < 1) {
            abort(404);
        }

        $pagos = Pago::query()
            ->where(
                'origen_tipo',
                'VENTA'
            )
            ->where(
                'origen_id',
                $venta
            )
            ->where(
                'estado',
                'CONFIRMADO'
            )
            ->get();

        $totalPagado = bcadd(
            (string) $pagos->sum('monto'),
            '0',
            2
        );

        $qrPendientes = \App\Models\IntentoQr::query()
            ->where('origen_tipo', 'VENTA')
            ->where('origen_id', $venta)
            ->whereIn('estado', ['INICIADA', 'PENDIENTE'])
            ->count();

        return response()->json([
            'tiene_qr_pendiente' => $qrPendientes > 0,
            'cantidad_qr_pendientes' => $qrPendientes,
            'venta_id' => $venta,

            'tiene_pago_confirmado' =>
                $pagos->isNotEmpty(),

            'cantidad_pagos_confirmados' =>
                $pagos->count(),

            'total_pagado' =>
                $totalPagado,

            'pagos' => $pagos
                ->map(fn (Pago $pago) => [
                    'id_pago' =>
                        $pago->id_pago,

                    'monto' =>
                        (string) $pago->monto,

                    'medio' =>
                        $pago->medio,

                    'estado' =>
                        $pago->estado,

                    'confirmado_at' =>
                        $pago->confirmado_at,
                ])
                ->values(),
        ]);
    }
}
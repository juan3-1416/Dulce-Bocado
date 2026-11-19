<?php

namespace App\Services\Pagos;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class OrigenPagoService
{
    public function obtener(
        string $tipo,
        int $id,
        string $token,
        bool $requierePagable = true
    ): array {
        $tipo = strtoupper($tipo);

        if ($tipo === 'VENTA') {
            $config = 'sales';
            $ruta = '/api/ventas/'.$id;
            $raiz = 'venta';
            $idCampo = 'id_venta';
        } elseif ($tipo === 'PEDIDO') {
            $config = 'orders';
            $ruta = '/api/pedidos/'.$id;
            $raiz = 'pedido';
            $idCampo = 'id_pedido';
        } else {
            throw new PagoException(
                422,
                'ORIGEN_TIPO_INVALIDO',
                'El tipo de origen no es válido.'
            );
        }

        $url = config("integrations.$config.url");

        if (!is_string($url) || $url === '') {
            throw new PagoException(
                503,
                'ORIGEN_NO_CONFIGURADO',
                'El servicio propietario no está configurado.'
            );
        }

        try {
            $respuesta = Http::timeout(
                max(
                    1,
                    (int) config(
                        "integrations.$config.timeout",
                        3
                    )
                )
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withToken($token)
                ->get(rtrim($url, '/').$ruta);
        } catch (ConnectionException) {
            throw new PagoException(
                503,
                'ORIGEN_NO_DISPONIBLE',
                'El servicio propietario no está disponible.'
            );
        }

        $this->validarRespuestaHttp(
            $respuesta,
            $tipo
        );

        $origen = $respuesta->json($raiz);

        if (
            !is_array($origen) ||
            !is_numeric($origen[$idCampo] ?? null) ||
            (int) $origen[$idCampo] !== $id ||
            !is_numeric($origen['total'] ?? null) ||
            !is_string($origen['estado'] ?? null)
        ) {
            throw new PagoException(
                503,
                'RESPUESTA_ORIGEN_INVALIDA',
                'El servicio propietario devolvió una respuesta inválida.'
            );
        }

        $total = bcadd(
            (string) $origen['total'],
            '0',
            2
        );

        if (bccomp($total, '0.00', 2) <= 0) {
            throw new PagoException(
                409,
                'ORIGEN_TOTAL_INVALIDO',
                'La operación no posee un total pagable.'
            );
        }

        $moneda = strtoupper(
            (string) ($origen['moneda'] ?? 'BOB')
        );

        if ($moneda !== 'BOB') {
            throw new PagoException(
                409,
                'MONEDA_ORIGEN_NO_SOPORTADA',
                'La moneda del origen no es compatible.'
            );
        }

        $estado = strtoupper(
            (string) $origen['estado']
        );

        if ($requierePagable) {
            $this->validarEstadoPagable(
                $tipo,
                $estado
            );
        }

        return [
            'tipo' => $tipo,
            'id' => $id,
            'total' => $total,
            'moneda' => $moneda,
            'estado' => $estado,
        ];
    }

    private function validarRespuestaHttp(
        Response $respuesta,
        string $tipo
    ): void {
        if ($respuesta->status() === 404) {
            throw new PagoException(
                404,
                'ORIGEN_NO_ENCONTRADO',
                $tipo === 'VENTA'
                    ? 'La venta no existe.'
                    : 'El pedido no existe.'
            );
        }

        if (
            $respuesta->status() === 401 ||
            $respuesta->status() === 403
        ) {
            throw new PagoException(
                $respuesta->status(),
                'ORIGEN_NO_AUTORIZADO',
                'No tiene acceso a la operación de origen.'
            );
        }

        if (!$respuesta->ok()) {
            throw new PagoException(
                503,
                'ORIGEN_NO_DISPONIBLE',
                'El servicio propietario no está disponible.'
            );
        }
    }

    private function validarEstadoPagable(
        string $tipo,
        string $estado
    ): void {
        if ($tipo === 'VENTA') {
            if ($estado === 'CANCELADA') {
                throw new PagoException(
                    409,
                    'ORIGEN_CANCELADO',
                    'La venta está cancelada.'
                );
            }

            if ($estado !== 'CONFIRMADA') {
                throw new PagoException(
                    409,
                    'VENTA_NO_CONFIRMADA',
                    'La venta debe estar confirmada antes de registrar pagos.'
                );
            }

            return;
        }

        if ($estado === 'CANCELADO') {
            throw new PagoException(
                409,
                'ORIGEN_CANCELADO',
                'El pedido está cancelado.'
            );
        }

        if (
            !in_array(
                $estado,
                [
                    'PROGRAMADO',
                    'EN_PROCESO',
                    'ENTREGADO',
                ],
                true
            )
        ) {
            throw new PagoException(
                409,
                'PEDIDO_NO_PAGABLE',
                'El pedido no se encuentra en un estado pagable.'
            );
        }
    }
}
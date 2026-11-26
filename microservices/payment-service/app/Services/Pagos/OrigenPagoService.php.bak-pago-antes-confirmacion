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

    public function obtenerDetalleCompleto(
        string $tipo,
        int $id,
        string $token
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
            (int) $origen[$idCampo] !== $id
        ) {
            throw new PagoException(
                503,
                'RESPUESTA_ORIGEN_INVALIDA',
                'El servicio propietario devolvió una respuesta inválida.'
            );
        }

        $total = bcadd(
            (string) ($origen['total'] ?? '0'),
            '0',
            2
        );
        $moneda = strtoupper(
            (string) ($origen['moneda'] ?? 'BOB')
        );
        $estado = strtoupper(
            (string) ($origen['estado'] ?? '')
        );

        $clienteId = isset($origen['id_cliente'])
            ? (int) $origen['id_cliente']
            : (isset($origen['cliente_id']) ? (int) $origen['cliente_id'] : null);

        $nombreOcasional = trim(
            (string) ($origen['nombre_cliente_ocasional'] ?? '')
        );

        $nombreCliente = 'Cliente ocasional';
        $ciNitCliente = null;

        if ($clienteId !== null && $clienteId > 0) {
            $datosCliente = $this->obtenerCliente($clienteId, $token);
            $nombreCliente = $datosCliente['nombre'];
            $ciNitCliente = $datosCliente['ci_nit'];
        } elseif ($nombreOcasional !== '') {
            $nombreCliente = $nombreOcasional;
        }

        $detalles = [];
        $rawDetalles = is_array($origen['detalles'] ?? null)
            ? $origen['detalles']
            : [];

        foreach ($rawDetalles as $item) {
            $cantidad = (int) ($item['cantidad'] ?? 1);
            $precioUnitario = bcadd(
                (string) (
                    $item['precio_unitario_snapshot']
                    ?? $item['precio_unitario']
                    ?? '0'
                ),
                '0',
                2
            );
            $subtotal = bcadd(
                (string) (
                    $item['subtotal']
                    ?? bcmul((string) $cantidad, $precioUnitario, 2)
                ),
                '0',
                2
            );
            $descripcion = (string) (
                $item['nombre_presentacion_snapshot']
                ?? $item['nombre_producto_snapshot']
                ?? $item['producto']
                ?? 'Item'
            );

            $detalles[] = [
                'descripcion' => $descripcion,
                'cantidad' => $cantidad,
                'precio_unitario' => $precioUnitario,
                'subtotal' => $subtotal,
            ];
        }

        return [
            'tipo' => $tipo,
            'id' => $id,
            'total' => $total,
            'moneda' => $moneda,
            'estado' => $estado,
            'cliente' => [
                'id_cliente' => $clienteId,
                'nombre' => $nombreCliente,
                'ci_nit' => $ciNitCliente,
            ],
            'detalles' => $detalles,
            'raw_origen' => $origen,
        ];
    }

    private function obtenerCliente(int $clienteId, string $token): array
    {
        $url = config('integrations.customer.url');
        $clave = config('integrations.customer.key');

        if (!is_string($url) || $url === '') {
            return [
                'nombre' => 'Cliente #' . $clienteId,
                'ci_nit' => null,
            ];
        }

        try {
            $req = Http::timeout(
                max(
                    1,
                    (int) config(
                        'integrations.customer.timeout',
                        3
                    )
                )
            )
                ->connectTimeout(1)
                ->acceptJson();

            if (is_string($clave) && $clave !== '') {
                $req = $req->withHeaders([
                    'X-Internal-Service-Key' => $clave,
                ]);
            } else {
                $req = $req->withToken($token);
            }

            $respuesta = $req->get(
                rtrim($url, '/').'/api/clientes/'.$clienteId
            );

            if ($respuesta->ok()) {
                $c = $respuesta->json('cliente') ?? $respuesta->json();
                $nombre = trim(
                    ($c['nombre'] ?? '').' '.($c['apellido'] ?? '')
                );

                return [
                    'nombre' => $nombre !== ''
                        ? $nombre
                        : 'Cliente #' . $clienteId,
                    'ci_nit' => $c['ci_nit'] ?? null,
                ];
            }
        } catch (\Throwable) {
            // Silently fallback gracefully
        }

        return [
            'nombre' => 'Cliente #' . $clienteId,
            'ci_nit' => null,
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
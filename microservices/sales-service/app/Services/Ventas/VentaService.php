<?php

namespace App\Services\Ventas;

use App\Models\Venta;
use App\Services\Catalogo\CatalogoService;
use App\Services\Clientes\ClienteService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;

class VentaService
{
    public function __construct(private ClienteService $clientes, private CatalogoService $catalogo) {}

    public function crear(array $datos, int $actor, string $clave): array
    {
        $operacion = 'crear';
        $hash = $this->hash($datos);
        if ($previa = $this->respuestaPrevia($operacion, $clave, $hash, $actor)) {
            return $previa;
        }

        $cliente = $this->clientes->validarParaVenta($datos['id_cliente'] ?? null, $datos['nombre_cliente_ocasional'] ?? null, $actor);
        [$detalles, $total] = $this->prepararDetalles($datos['items'], $actor);

        return $this->ejecutar($operacion, $clave, $hash, $actor, 201, function () use ($cliente, $detalles, $total, $datos, $actor) {
            $venta = Venta::create([
                ...$cliente,
                'id_usuario' => $actor,
                'fecha_venta' => now(),
                'total' => $total,
                'moneda' => 'BOB',
                'estado' => 'BORRADOR',
                'observaciones' => $datos['observaciones'] ?? null,
            ]);
            $venta->detalles()->createMany($detalles);

            return ['venta' => $venta->load('detalles')->toArray()];
        });
    }

    public function modificar(Venta $venta, array $datos, int $actor, string $clave): array
    {
        $operacion = 'modificar:'.$venta->getKey();
        $hash = $this->hash($datos);
        if ($previa = $this->respuestaPrevia($operacion, $clave, $hash, $actor)) {
            return $previa;
        }
        $this->exigirBorrador($venta);
        $cliente = $this->clientes->validarParaVenta($datos['id_cliente'] ?? null, $datos['nombre_cliente_ocasional'] ?? null, $actor);
        [$detalles, $total] = $this->prepararDetalles($datos['items'], $actor);

        return $this->ejecutar($operacion, $clave, $hash, $actor, 200, function () use ($venta, $cliente, $detalles, $total, $datos, $actor) {
            $actual = Venta::whereKey($venta->getKey())->lockForUpdate()->firstOrFail();
            $this->exigirBorrador($actual);
            $this->exigirVentaSinCobros($actual, $actor);
            $actual->update([...$cliente, 'total' => $total, 'observaciones' => $datos['observaciones'] ?? null]);
            $actual->detalles()->delete();
            $actual->detalles()->createMany($detalles);

            return ['venta' => $actual->load('detalles')->toArray()];
        });
    }

    public function anular(Venta $venta, string $motivo, int $actor, string $clave): array
    {
        $operacion = 'anular:'.$venta->getKey();
        $motivo = trim($motivo);
        $hash = $this->hash(['motivo' => $motivo]);
        if ($previa = $this->respuestaPrevia($operacion, $clave, $hash, $actor)) {
            return $previa;
        }

        return $this->ejecutar($operacion, $clave, $hash, $actor, 200, function () use ($venta, $motivo, $actor) {
            $actual = Venta::whereKey($venta->getKey())->lockForUpdate()->firstOrFail();
            $this->exigirBorrador($actual);
            $this->exigirVentaSinCobros($actual, $actor, permitirQrPendiente: true);
            $actual->update([
                'estado' => 'CANCELADA',
                'id_usuario_cancelacion' => $actor,
                'motivo_cancelacion' => $motivo,
                'fecha_cancelacion' => now(),
            ]);

            return ['venta' => $actual->load('detalles')->toArray()];
        });
    }

    private function prepararDetalles(array $items, int $actor): array
    {
        $detalles = [];
        $total = '0.00';
        foreach ($items as $item) {
            $presentacion = $this->catalogo->obtenerPresentacionVendible((int) $item['presentacion_id'], $actor);
            $subtotal = bcmul($presentacion['precio_unitario_snapshot'], (string) $item['cantidad'], 2);
            $total = bcadd($total, $subtotal, 2);
            if (bccomp($total, '9999999999.99', 2) === 1 || bccomp($subtotal, '9999999999.99', 2) === 1) {
                throw new VentaException(422, 'TOTAL_FUERA_DE_RANGO', 'El importe supera el límite permitido.');
            }
            $detalles[] = [
                'presentacion_id' => $presentacion['presentacion_id'],
                'nombre_presentacion_snapshot' => $presentacion['nombre_presentacion_snapshot'],
                'precio_unitario_snapshot' => $presentacion['precio_unitario_snapshot'],
                'cantidad' => (int) $item['cantidad'],
                'costo_personalizacion' => '0.00',
                'detalle_personalizacion' => null,
                'subtotal' => $subtotal,
            ];
        }

        return [$detalles, $total];
    }

    private function exigirVentaSinCobros(
        Venta $venta,
        int $actor,
        bool $permitirQrPendiente = false
    ): void {
        $url = config('services.payment.url');
        $key = config('services.payment.sales_key');

        if (
            !is_string($url) || $url === '' ||
            !is_string($key) || $key === ''
        ) {
            throw new VentaException(
                503,
                'PAYMENT_NO_CONFIGURADO',
                'No se puede verificar el estado de los cobros.'
            );
        }

        try {
            $respuesta = Http::timeout(
                max(1, (int) config('services.payment.timeout', 3))
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' => $key,
                    'X-Actor-User-Id' => (string) $actor,
                ])
                ->get(
                    rtrim($url, '/').
                    '/api/internal/ventas/'.
                    $venta->id_venta.
                    '/pagos'
                );
        } catch (ConnectionException) {
            throw new VentaException(
                503,
                'PAYMENT_NO_DISPONIBLE',
                'No se pudo verificar si la venta tiene cobros registrados.'
            );
        }

        if (!$respuesta->ok()) {
            throw new VentaException(
                503,
                'PAYMENT_NO_DISPONIBLE',
                'Payment no pudo verificar el estado de los cobros.'
            );
        }

        $ventaRespuesta = $respuesta->json('venta_id');
        $tienePago = $respuesta->json('tiene_pago_confirmado');
        $tieneQr = $respuesta->json('tiene_qr_pendiente');

        if (
            !is_numeric($ventaRespuesta) ||
            (int) $ventaRespuesta !== (int) $venta->id_venta ||
            !is_bool($tienePago) ||
            !is_bool($tieneQr)
        ) {
            throw new VentaException(
                503,
                'RESPUESTA_PAYMENT_INVALIDA',
                'No se pudo verificar correctamente el estado de los cobros.'
            );
        }

        if ($tienePago) {
            throw new VentaException(
                409,
                'VENTA_CON_PAGOS',
                'No se puede modificar ni anular una venta con pagos confirmados.'
            );
        }

        if ($tieneQr && !$permitirQrPendiente) {
            throw new VentaException(
                409,
                'VENTA_CON_QR_PENDIENTE',
                'No se puede modificar ni anular una venta con un cobro QR pendiente.'
            );
        }
    }

    private function exigirBorrador(Venta $venta): void
    {
        if ($venta->estado !== 'BORRADOR') {
            throw new VentaException(
                409,
                'VENTA_NO_EDITABLE',
                'Solo se puede modificar o cancelar un borrador.'
            );
        }

        $confirmacion = DB::table(
            'venta_confirmacion'
        )
            ->where(
                'id_venta',
                $venta->id_venta
            )
            ->first();

        if (!$confirmacion) {
            return;
        }

        if (
            in_array(
                $confirmacion->estado,
                ['PENDIENTE', 'INCIERTA'],
                true
            )
        ) {
            throw new VentaException(
                409,
                'CONFIRMACION_EN_CURSO',
                'La venta tiene una confirmación pendiente o incierta y no puede modificarse ni anularse.'
            );
        }

        if (
            $confirmacion->estado ===
            'RECHAZADA'
        ) {
            throw new VentaException(
                409,
                'VENTA_BLOQUEADA_POR_CONFIRMACION',
                'La confirmación fue rechazada. Reponga stock y reintente con la misma Idempotency-Key.'
            );
        }

        throw new VentaException(
            409,
            'VENTA_BLOQUEADA_POR_CONFIRMACION',
            'La venta ya inició su proceso de confirmación.'
        );
    }

    private function ejecutar(string $operacion, string $clave, string $hash, int $actor, int $codigo, callable $accion): array
    {
        try {
            return DB::transaction(function () use ($operacion, $clave, $hash, $actor, $codigo, $accion) {
                DB::table('venta_idempotencia')->insert([
                    'operacion' => $operacion, 'clave' => $clave, 'hash_solicitud' => $hash,
                    'id_usuario' => $actor, 'codigo_http' => 0, 'respuesta' => '{}',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $respuesta = $accion();
                DB::table('venta_idempotencia')->where('operacion', $operacion)->where('clave', $clave)
                    ->update(['codigo_http' => $codigo, 'respuesta' => json_encode($respuesta, JSON_THROW_ON_ERROR), 'updated_at' => now()]);

                return ['status' => $codigo, 'body' => $respuesta];
            });
        } catch (QueryException $e) {
            if (in_array((string) $e->getCode(), ['23505', '23000', '19'], true) &&
                $previa = $this->respuestaPrevia($operacion, $clave, $hash, $actor)) {
                return $previa;
            }
            throw $e;
        }
    }

    private function respuestaPrevia(string $operacion, string $clave, string $hash, int $actor): ?array
    {
        $fila = DB::table('venta_idempotencia')->where('operacion', $operacion)->where('clave', $clave)->first();
        if (!$fila) {
            return null;
        }
        if ($fila->hash_solicitud !== $hash || (int) $fila->id_usuario !== $actor) {
            throw new VentaException(409, 'CLAVE_IDEMPOTENTE_EN_CONFLICTO', 'La clave ya se utilizó con otra solicitud.');
        }

        return ['status' => (int) $fila->codigo_http, 'body' => json_decode($fila->respuesta, true, 512, JSON_THROW_ON_ERROR)];
    }

    private function hash(array $datos): string
    {
        $normalizar = function (array $array) use (&$normalizar): array {
            if (!array_is_list($array)) {
                ksort($array);
            }
            foreach ($array as &$valor) {
                if (is_array($valor)) {
                    $valor = $normalizar($valor);
                }
            }
            return $array;
        };

        return hash('sha256', json_encode($normalizar($datos), JSON_THROW_ON_ERROR));
    }
}

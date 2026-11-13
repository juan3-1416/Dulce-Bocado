<?php

namespace App\Services\Pedidos;

use App\Models\Pedido;
use App\Services\Catalogo\CatalogoService;
use App\Services\Clientes\ClienteService;
use Illuminate\Support\Facades\DB;

class PedidoService
{
    public function __construct(
        private readonly ClienteService $clientes,
        private readonly CatalogoService $catalogo,
    ) {
    }

    public function crear(array $datos, int $actorId): Pedido
    {
        $cliente = $this->clientes->validarParaPedido(
            $datos['tipo_cliente'],
            isset($datos['id_cliente']) ? (int) $datos['id_cliente'] : null,
            $datos['nombre_cliente_ocasional'] ?? null,
            $actorId
        );

        $detalles = $this->prepararDetalles(
            $datos['detalles'],
            $actorId
        );

        return DB::transaction(function () use (
            $datos,
            $cliente,
            $detalles,
            $actorId
        ) {
            $pedido = Pedido::create([
                ...$cliente,
                'id_usuario' => $actorId,
                'fecha_pedido' => now(),
                'fecha_entrega' => $datos['fecha_entrega'],
                'hora_entrega' => $datos['hora_entrega'],
                'total' => collect($detalles)->sum('subtotal'),
                'moneda' => 'BOB',
                'estado' => 'PROGRAMADO',
                'observaciones' =>
                    isset($datos['observaciones'])
                        ? trim((string) $datos['observaciones'])
                        : null,
            ]);

            $pedido->detalles()->createMany($detalles);

            return $pedido->load('detalles');
        });
    }

    public function actualizar(
        Pedido $pedido,
        array $datos,
        int $actorId
    ): Pedido {
        if ($pedido->estado !== 'PROGRAMADO') {
            throw new PedidoException(
                409,
                'PEDIDO_NO_EDITABLE',
                'Solo se pueden modificar pedidos en estado PROGRAMADO.'
            );
        }

        $cliente = $this->clientes->validarParaPedido(
            $datos['tipo_cliente'],
            isset($datos['id_cliente']) ? (int) $datos['id_cliente'] : null,
            $datos['nombre_cliente_ocasional'] ?? null,
            $actorId
        );

        $detalles = $this->prepararDetalles(
            $datos['detalles'],
            $actorId
        );

        return DB::transaction(function () use (
            $pedido,
            $datos,
            $cliente,
            $detalles
        ) {
            $bloqueado = Pedido::query()
                ->lockForUpdate()
                ->find($pedido->id_pedido);

            if (!$bloqueado) {
                throw new PedidoException(
                    404,
                    'PEDIDO_NO_ENCONTRADO',
                    'Pedido no encontrado.'
                );
            }

            if ($bloqueado->estado !== 'PROGRAMADO') {
                throw new PedidoException(
                    409,
                    'PEDIDO_NO_EDITABLE',
                    'Solo se pueden modificar pedidos en estado PROGRAMADO.'
                );
            }

            $bloqueado->update([
                ...$cliente,
                'fecha_entrega' => $datos['fecha_entrega'],
                'hora_entrega' => $datos['hora_entrega'],
                'total' => collect($detalles)->sum('subtotal'),
                'observaciones' =>
                    isset($datos['observaciones'])
                        ? trim((string) $datos['observaciones'])
                        : null,
            ]);

            $bloqueado->detalles()->delete();
            $bloqueado->detalles()->createMany($detalles);

            return $bloqueado->fresh()->load('detalles');
        });
    }

    private function prepararDetalles(
        array $detalles,
        int $actorId
    ): array {
        $resultado = [];

        foreach ($detalles as $indice => $detalle) {
            $catalogo = $this->catalogo
                ->obtenerPresentacionParaPedido(
                    (int) $detalle['id_producto_presentacion'],
                    $actorId
                );

            $personalizacion = trim(
                (string) ($detalle['detalle_personalizacion'] ?? '')
            );

            $costo = round(
                (float) ($detalle['costo_personalizacion'] ?? 0),
                2
            );

            if (
                !$catalogo['permite_personalizacion'] &&
                ($personalizacion !== '' || $costo > 0)
            ) {
                throw new PedidoException(
                    409,
                    'PERSONALIZACION_NO_PERMITIDA',
                    "La presentación del detalle ".($indice + 1)." no permite personalización."
                );
            }

            if ($costo > 0 && $personalizacion === '') {
                throw new PedidoException(
                    422,
                    'DETALLE_PERSONALIZACION_REQUERIDO',
                    'Debe indicar el detalle de la personalización cuando exista un costo adicional.'
                );
            }

            $cantidad = (int) $detalle['cantidad'];
            $precio = round(
                (float) $catalogo['precio_unitario_snapshot'],
                2
            );

            $subtotal = round(
                ($precio * $cantidad) + $costo,
                2
            );

            $resultado[] = [
                'presentacion_id' =>
                    $catalogo['presentacion_id'],

                'nombre_producto_snapshot' =>
                    $catalogo['nombre_producto_snapshot'],

                'nombre_presentacion_snapshot' =>
                    $catalogo['nombre_presentacion_snapshot'],

                'precio_unitario_snapshot' => $precio,

                'cantidad' => $cantidad,

                'detalle_personalizacion' =>
                    $personalizacion !== ''
                        ? $personalizacion
                        : null,

                'costo_personalizacion' => $costo,

                'subtotal' => $subtotal,
            ];
        }

        return $resultado;
    }
}
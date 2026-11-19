<?php

namespace App\Services\Inventario;

use App\Models\Almacen;
use App\Models\Existencia;
use App\Models\Movimiento;
use Illuminate\Support\Facades\DB;

class VentaInventarioService
{
    public function aplicar(array $datos, int $actor): array
    {
        $items = collect($datos['items'])->map(fn (array $item) => [
            'presentacion_id' => (int) $item['presentacion_id'],
            'cantidad' => (int) $item['cantidad'],
        ])->sortBy('presentacion_id')->values()->all();
        $id = $datos['operacion_id'];
        $venta = (int) $datos['venta_id'];
        $huella = hash('sha256', json_encode([$venta, $actor, $items], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($items, $id, $venta, $actor, $huella) {
            // Serializa las ventas del mostrador, incluso si falta una fila de existencia.
            $almacen = Almacen::where('tipo', 'MOSTRADOR')->lockForUpdate()->first();
            $previa = DB::table('venta_operacion')->where('operacion_id', $id)->first();
            if ($previa) {
                if (! hash_equals($previa->huella_solicitud, $huella)) {
                    throw new InventarioException(409, 'OPERACION_ID_EN_CONFLICTO', 'La operación tiene otro contenido o actor.');
                }
                return $this->respuesta($id, $venta);
            }
            if (! $almacen || ! $almacen->activo) {
                throw new InventarioException(503, 'MOSTRADOR_NO_DISPONIBLE', 'El almacén mostrador no está disponible.');
            }
            if (DB::table('venta_operacion')->where('venta_id', $venta)->exists()) {
                throw new InventarioException(409, 'VENTA_YA_DESCONTADA', 'La venta ya tiene un descuento registrado.');
            }
            $existencias = Existencia::where('almacen_id', $almacen->id_almacen)
                ->where('tipo_articulo', 'PRESENTACION')
                ->whereIn('articulo_id', array_column($items, 'presentacion_id'))
                ->orderBy('articulo_id')->lockForUpdate()->get()->keyBy('articulo_id');
            foreach ($items as $item) {
                $stock = $existencias->get($item['presentacion_id']);
                if (! $stock || bccomp((string) $stock->cantidad, (string) $item['cantidad'], 3) < 0) {
                    throw new InventarioException(409, 'STOCK_INSUFICIENTE', 'No hay existencias suficientes en mostrador.');
                }
                if ($stock->unidad !== 'unidad') {
                    throw new InventarioException(422, 'UNIDAD_INCONSISTENTE', 'La presentación debe medirse en unidades.');
                }
            }
            DB::table('venta_operacion')->insert([
                'operacion_id' => $id, 'venta_id' => $venta,
                'huella_solicitud' => $huella, 'actor_usuario_id' => $actor,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($items as $item) {
                $stock = $existencias->get($item['presentacion_id']);
                $stock->update(['cantidad' => bcsub((string) $stock->cantidad, (string) $item['cantidad'], 3)]);
                Movimiento::create([
                    'tipo' => 'EGRESO', 'tipo_articulo' => 'PRESENTACION',
                    'articulo_id' => $item['presentacion_id'], 'cantidad' => $item['cantidad'],
                    'unidad' => 'unidad', 'almacen_origen_id' => $almacen->id_almacen,
                    'almacen_destino_id' => null, 'motivo' => 'Venta de mostrador',
                    'referencia_tipo' => 'VENTA', 'referencia_id' => $id,
                    'actor_usuario_id' => $actor,
                ]);
            }
            return $this->respuesta($id, $venta);
        });
    }

    public function consultar(string $id): ?array
    {
        $operacion = DB::table('venta_operacion')->where('operacion_id', $id)->first();
        return $operacion ? $this->respuesta($id, (int) $operacion->venta_id) : null;
    }

    private function respuesta(string $id, int $venta): array
    {
        return ['operacion_id' => $id, 'venta_id' => $venta, 'estado' => 'APLICADA'];
    }
}

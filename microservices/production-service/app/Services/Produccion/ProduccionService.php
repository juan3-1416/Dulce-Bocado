<?php

namespace App\Services\Produccion;

use App\Models\Produccion;
use App\Models\ProduccionIdempotencia;
use App\Services\Catalogo\CatalogoRecetaService;
use App\Services\Inventario\InventarioService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProduccionService
{
    public function __construct(
        private CatalogoRecetaService $catalogo,
        private InventarioService $inventario,
    ) {}

    public function registrar(array $datos, int $actor, string $clave): array
    {
        $datos['observaciones'] = isset($datos['observaciones'])
            ? trim($datos['observaciones']) : null;
        $huella = hash('sha256', json_encode([
            'actor' => $actor,
            'presentacion_id' => (int) $datos['presentacion_id'],
            'cantidad' => (int) $datos['cantidad'],
            'observaciones' => $datos['observaciones'],
        ], JSON_THROW_ON_ERROR));

        $previa = ProduccionIdempotencia::with('produccion')->where('clave', $clave)->first();
        if ($previa) return $this->reintentar($previa, $huella);

        $receta = $this->catalogo->obtenerParaProduccion((int) $datos['presentacion_id'], $actor);
        $ingredientes = [];
        foreach ($receta['ingredientes'] as $ingrediente) {
            $cantidad = bcmul($ingrediente['cantidad_por_unidad'], (string) $datos['cantidad'], 3);
            if (bccomp($cantidad, '999999999.999', 3) > 0) {
                throw new ProduccionException(422, 'CONSUMO_FUERA_DE_RANGO', 'El consumo supera el límite permitido.');
            }
            $ingredientes[] = [
                'materia_prima_id' => $ingrediente['materia_prima_id'],
                'cantidad' => $cantidad,
                'unidad' => $ingrediente['unidad'],
            ];
        }

        try {
            $produccion = DB::transaction(function () use ($datos, $actor, $clave, $huella, $receta, $ingredientes) {
                $produccion = Produccion::create([
                    'operacion_id' => (string) Str::uuid(),
                    'presentacion_id' => $receta['presentacion_id'],
                    'receta_id' => $receta['receta_id'],
                    'cantidad' => (int) $datos['cantidad'],
                    'estado' => 'EN_PROCESO',
                    'consumo_snapshot' => [
                        'unidad_terminado' => $receta['unidad_terminado'],
                        'ingredientes' => $ingredientes,
                    ],
                    'actor_usuario_id' => $actor,
                    'observaciones' => $datos['observaciones'],
                ]);

                ProduccionIdempotencia::create([
                    'clave' => $clave,
                    'huella_solicitud' => $huella,
                    'id_produccion' => $produccion->id_produccion,
                ]);

                return $produccion;
            });
        } catch (QueryException $e) {
            if (in_array((string) $e->getCode(), ['23505', '23000', '19'], true)) {
                $previa = ProduccionIdempotencia::with('produccion')->where('clave', $clave)->first();
                if ($previa) return $this->reintentar($previa, $huella);
            }
            throw $e;
        }

        return $this->avanzar($produccion, false);
    }

    private function reintentar(ProduccionIdempotencia $registro, string $huella): array
    {
        if (!hash_equals($registro->huella_solicitud, $huella)) {
            throw new ProduccionException(409, 'CLAVE_IDEMPOTENTE_EN_CONFLICTO', 'La clave ya se utilizó con otra solicitud.');
        }

        return $this->avanzar($registro->produccion, true);
    }

    private function avanzar(Produccion $produccion, bool $reintento): array
    {
        if ($produccion->estado !== 'EN_PROCESO') return $this->respuestaFinal($produccion);

        if ($reintento) {
            $consulta = $this->inventario->consultar($produccion);
            if ($consulta['estado'] === 'APLICADA' || $consulta['estado'] === 'RECHAZADA') {
                return $this->finalizar($produccion, $consulta);
            }
            if ($consulta['estado'] === 'INCIERTA') return $this->respuestaEnProceso($produccion);
        }

        $resultado = $this->inventario->aplicar($produccion);
        if ($resultado['estado'] === 'INCIERTA') {
            $resultado = $this->inventario->consultar($produccion);
        }
        if ($resultado['estado'] === 'APLICADA' || $resultado['estado'] === 'RECHAZADA') {
            return $this->finalizar($produccion, $resultado);
        }

        return $this->respuestaEnProceso($produccion);
    }

    private function finalizar(Produccion $produccion, array $resultado): array
    {
        return DB::transaction(function () use ($produccion, $resultado) {
            $actual = Produccion::whereKey($produccion->getKey())->lockForUpdate()->firstOrFail();
            if ($actual->estado !== 'EN_PROCESO') return $this->respuestaFinal($actual);

            if ($resultado['estado'] === 'APLICADA') {
                $actual->update(['estado' => 'COMPLETADA', 'fecha_completada' => now()]);
            } else {
                $actual->update([
                    'estado' => 'RECHAZADA',
                    'codigo_rechazo' => $resultado['codigo'],
                    'fecha_rechazada' => now(),
                ]);
            }

            $respuesta = $this->construirRespuesta($actual->fresh());
            ProduccionIdempotencia::where('id_produccion', $actual->getKey())->update([
                'codigo_respuesta' => $respuesta['status'],
                'respuesta_snapshot' => $respuesta['body'],
            ]);

            return $respuesta;
        });
    }

    private function respuestaFinal(Produccion $produccion): array
    {
        $registro = ProduccionIdempotencia::where('id_produccion', $produccion->getKey())->first();
        if ($registro?->codigo_respuesta && is_array($registro->respuesta_snapshot)) {
            return ['status' => $registro->codigo_respuesta, 'body' => $registro->respuesta_snapshot];
        }

        return $this->construirRespuesta($produccion);
    }

    private function respuestaEnProceso(Produccion $produccion): array
    {
        return [
            'status' => 202,
            'body' => [
                'message' => 'Producción en proceso de conciliación.',
                'produccion' => $produccion->fresh()->toArray(),
            ],
        ];
    }

    private function construirRespuesta(Produccion $produccion): array
    {
        if ($produccion->estado === 'RECHAZADA') {
            return [
                'status' => 409,
                'body' => [
                    'error' => [
                        'code' => $produccion->codigo_rechazo,
                        'message' => 'Inventario rechazó la producción.',
                        'details' => [],
                    ],
                    'produccion' => $produccion->toArray(),
                ],
            ];
        }

        return [
            'status' => 201,
            'body' => [
                'message' => 'Producción completada correctamente.',
                'produccion' => $produccion->toArray(),
            ],
        ];
    }
}

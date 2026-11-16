<?php

namespace App\Services\Catalogo;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CatalogoRecetaService
{
    public function obtenerParaProduccion(int $presentacionId, int $actorId): array
    {
        if ($presentacionId < 1 || $actorId < 1) {
            throw new CatalogoRecetaException(422, 'REFERENCIA_INVALIDA', 'La presentación o el actor no son válidos.');
        }

        $url = config('services.catalog.url');
        $clave = config('services.catalog.key');

        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            throw new CatalogoRecetaException(503, 'CATALOGO_NO_CONFIGURADO', 'No se puede consultar la receta ahora.');
        }

        try {
            $respuesta = Http::timeout(max(1, (int) config('services.catalog.timeout', 3)))
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' => $clave,
                    'X-Actor-User-Id' => (string) $actorId,
                ])
                ->get(rtrim($url, '/').'/api/presentaciones/'.$presentacionId.'/receta');
        } catch (ConnectionException) {
            throw new CatalogoRecetaException(503, 'CATALOGO_NO_DISPONIBLE', 'No se puede consultar la receta ahora.');
        }

        if ($respuesta->status() === 404) {
            throw new CatalogoRecetaException(404, 'RECETA_NO_ENCONTRADA', 'La presentación no tiene una receta.');
        }

        if (!$respuesta->ok()) {
            throw new CatalogoRecetaException(503, 'CATALOGO_NO_DISPONIBLE', 'No se puede consultar la receta ahora.');
        }

        $receta = $respuesta->json('receta');
        if (!is_array($receta) ||
            !is_int($receta['id_receta'] ?? null) || $receta['id_receta'] < 1 ||
            ($receta['presentacion_id'] ?? null) !== $presentacionId ||
            !is_bool($receta['estado'] ?? null) ||
            !is_array($receta['presentacion'] ?? null) ||
            ($receta['presentacion']['presentacion_id'] ?? null) !== $presentacionId ||
            !is_bool($receta['presentacion']['disponible'] ?? null) ||
            !is_array($receta['presentacion']['producto'] ?? null) ||
            !is_bool($receta['presentacion']['producto']['estado'] ?? null) ||
            !is_array($receta['detalles'] ?? null)) {
            throw $this->respuestaInvalida();
        }

        if (!$receta['estado'] || !$receta['presentacion']['disponible'] ||
            !$receta['presentacion']['producto']['estado']) {
            throw new CatalogoRecetaException(409, 'RECETA_NO_VIGENTE', 'La receta o su presentación no están vigentes.');
        }

        if ($receta['detalles'] === [] || !array_is_list($receta['detalles'])) {
            throw $this->respuestaInvalida();
        }

        $ingredientes = [];
        $vistos = [];
        foreach ($receta['detalles'] as $detalle) {
            if (!is_array($detalle) ||
                !is_int($detalle['id_materia_prima'] ?? null) ||
                $detalle['id_materia_prima'] < 1 ||
                !is_string($detalle['cantidad'] ?? null) ||
                !preg_match('/^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?$/D', $detalle['cantidad']) ||
                bccomp($detalle['cantidad'], '0', 3) <= 0 ||
                !is_array($detalle['materia_prima'] ?? null) ||
                ($detalle['materia_prima']['id_materia_prima'] ?? null) !== $detalle['id_materia_prima'] ||
                !is_bool($detalle['materia_prima']['estado'] ?? null) ||
                !in_array($detalle['materia_prima']['unidad_medida'] ?? null, ['g', 'ml', 'unidad'], true)) {
                throw $this->respuestaInvalida();
            }

            $id = $detalle['id_materia_prima'];
            if (isset($vistos[$id])) {
                throw $this->respuestaInvalida();
            }
            $vistos[$id] = true;

            if (!$detalle['materia_prima']['estado']) {
                throw new CatalogoRecetaException(409, 'INSUMO_INACTIVO', 'La receta contiene una materia prima inactiva.');
            }

            $ingredientes[] = [
                'materia_prima_id' => $id,
                'cantidad_por_unidad' => bcadd($detalle['cantidad'], '0', 3),
                'unidad' => $detalle['materia_prima']['unidad_medida'],
            ];
        }

        return [
            'receta_id' => $receta['id_receta'],
            'presentacion_id' => $presentacionId,
            'unidad_terminado' => 'unidad',
            'ingredientes' => $ingredientes,
        ];
    }

    private function respuestaInvalida(): CatalogoRecetaException
    {
        return new CatalogoRecetaException(503, 'RESPUESTA_CATALOGO_INVALIDA', 'Catálogo devolvió una receta inválida.');
    }
}

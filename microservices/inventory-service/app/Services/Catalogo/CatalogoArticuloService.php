<?php

namespace App\Services\Catalogo;

use App\Services\Inventario\InventarioException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CatalogoArticuloService
{
    public function obtener(
        string $tipoArticulo,
        int $articuloId,
        int $actor
    ): array {
        $url = config('services.catalog.url');
        $clave = config('services.catalog.key');

        if (
            !is_string($url) ||
            $url === '' ||
            !is_string($clave) ||
            $clave === ''
        ) {
            throw new InventarioException(
                503,
                'CATALOGO_NO_CONFIGURADO',
                'Catálogo no está disponible.'
            );
        }

        $ruta = match ($tipoArticulo) {
            'MATERIA_PRIMA' =>
                '/api/materias-primas/'.$articuloId,

            'PRESENTACION' =>
                '/api/presentaciones/'.$articuloId,

            default => throw new InventarioException(
                422,
                'TIPO_ARTICULO_INVALIDO',
                'El tipo de artículo no es válido.'
            ),
        };

        try {
            $respuesta = Http::timeout(
                max(1, (int) config('services.catalog.timeout', 3))
            )
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' => $clave,
                    'X-Actor-User-Id' => (string) $actor,
                ])
                ->get(rtrim($url, '/').$ruta);
        } catch (ConnectionException) {
            throw new InventarioException(
                503,
                'CATALOGO_NO_DISPONIBLE',
                'Catálogo no está disponible.'
            );
        }

        if ($respuesta->status() === 404) {
            throw new InventarioException(
                404,
                'ARTICULO_NO_ENCONTRADO',
                'El artículo no existe en Catálogo.'
            );
        }

        if (!$respuesta->ok()) {
            throw new InventarioException(
                503,
                'CATALOGO_NO_DISPONIBLE',
                'Catálogo no está disponible.'
            );
        }

        return $tipoArticulo === 'MATERIA_PRIMA'
            ? $this->materiaPrima($respuesta->json(), $articuloId)
            : $this->presentacion($respuesta->json(), $articuloId);
    }

    private function materiaPrima(
        array $respuesta,
        int $articuloId
    ): array {
        $materia = $respuesta['materia_prima'] ?? null;

        if (
            !is_array($materia) ||
            (int) ($materia['id_materia_prima'] ?? 0) !== $articuloId ||
            !array_key_exists('estado', $materia) ||
            !isset($materia['unidad_medida'])
        ) {
            throw new InventarioException(
                503,
                'RESPUESTA_CATALOGO_INVALIDA',
                'Catálogo devolvió una respuesta inválida.'
            );
        }

        if ($materia['estado'] !== true) {
            throw new InventarioException(
                409,
                'ARTICULO_INACTIVO',
                'La materia prima está inactiva.'
            );
        }

        $unidad = $materia['unidad_medida'];

        if (!in_array($unidad, ['g', 'ml', 'unidad'], true)) {
            throw new InventarioException(
                503,
                'RESPUESTA_CATALOGO_INVALIDA',
                'La unidad de la materia prima no es válida.'
            );
        }

        return [
            'tipo_articulo' => 'MATERIA_PRIMA',
            'articulo_id' => $articuloId,
            'unidad' => $unidad,
        ];
    }

    private function presentacion(
        array $respuesta,
        int $articuloId
    ): array {
        $presentacion = $respuesta['presentacion'] ?? null;

        if (
            !is_array($presentacion) ||
            (int) ($presentacion['presentacion_id'] ?? 0) !== $articuloId ||
            !array_key_exists('disponible', $presentacion)
        ) {
            throw new InventarioException(
                503,
                'RESPUESTA_CATALOGO_INVALIDA',
                'Catálogo devolvió una respuesta inválida.'
            );
        }

        if ($presentacion['disponible'] !== true) {
            throw new InventarioException(
                409,
                'ARTICULO_NO_DISPONIBLE',
                'La presentación no está disponible.'
            );
        }

        return [
            'tipo_articulo' => 'PRESENTACION',
            'articulo_id' => $articuloId,
            'unidad' => 'unidad',
        ];
    }
}
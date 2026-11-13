<?php

namespace App\Services\Catalogo;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CatalogoService
{
    public function obtenerPresentacionParaPedido(
        int $presentacionId,
        int $actorId
    ): array {
        if ($presentacionId < 1 || $actorId < 1) {
            throw new CatalogoServiceException(
                422,
                'PRESENTACION_INVALIDA',
                'La referencia de presentación no es válida.'
            );
        }

        $url = config('services.catalog.url');
        $clave = config('services.catalog.key');

        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            throw new CatalogoServiceException(
                503,
                'CATALOGO_NO_CONFIGURADO',
                'No se puede validar la presentación ahora.'
            );
        }

        try {
            $respuesta = Http::timeout(max(1, (int) config('services.catalog.timeout', 3)))
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' => $clave,
                    'X-Actor-User-Id' => (string) $actorId,
                ])
                ->get(rtrim($url, '/').'/api/presentaciones/'.$presentacionId);
        } catch (ConnectionException) {
            throw new CatalogoServiceException(
                503,
                'CATALOGO_NO_DISPONIBLE',
                'No se puede validar la presentación ahora.'
            );
        }

        if ($respuesta->status() === 404) {
            throw new CatalogoServiceException(
                404,
                'PRESENTACION_NO_ENCONTRADA',
                'La presentación no existe.'
            );
        }

        if (!$respuesta->ok()) {
            throw new CatalogoServiceException(
                503,
                'CATALOGO_NO_DISPONIBLE',
                'No se puede validar la presentación ahora.'
            );
        }

        $presentacion = $respuesta->json('presentacion');

        if (
            !is_array($presentacion) ||
            ($presentacion['presentacion_id'] ?? null) !== $presentacionId ||
            !is_string($presentacion['nombre'] ?? null) ||
            trim($presentacion['nombre']) === '' ||
            !is_string($presentacion['precio'] ?? null) ||
            !is_bool($presentacion['disponible'] ?? null) ||
            !is_bool($presentacion['permite_personalizacion'] ?? null) ||
            ($presentacion['moneda'] ?? null) !== 'BOB' ||
            !is_array($presentacion['producto'] ?? null) ||
            !is_string($presentacion['producto']['nombre'] ?? null) ||
            trim($presentacion['producto']['nombre']) === ''
        ) {
            throw new CatalogoServiceException(
                503,
                'RESPUESTA_CATALOGO_INVALIDA',
                'Catálogo devolvió una respuesta inválida.'
            );
        }

        if (!$presentacion['disponible']) {
            throw new CatalogoServiceException(
                409,
                'PRESENTACION_NO_DISPONIBLE',
                'La presentación no está disponible.'
            );
        }

        return [
            'presentacion_id' => $presentacionId,
            'nombre_producto_snapshot' =>
                trim($presentacion['producto']['nombre']),
            'nombre_presentacion_snapshot' =>
                trim($presentacion['nombre']),
            'precio_unitario_snapshot' =>
                round((float) $presentacion['precio'], 2),
            'moneda' => 'BOB',
            'permite_personalizacion' =>
                $presentacion['permite_personalizacion'],
        ];
    }
}
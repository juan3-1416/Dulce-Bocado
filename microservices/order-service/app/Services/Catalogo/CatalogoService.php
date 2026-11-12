<?php

namespace App\Services\Catalogo;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CatalogoService
{
    /**
     * Consulta una presentación disponible. La disponibilidad aquí es comercial;
     * la existencia física pertenece a Inventory y se integrará en Sprint 3.
     *
     * @return array{presentacion_id: int, nombre_presentacion_snapshot: string, precio_unitario_snapshot: string, moneda: string, permite_personalizacion: bool}
     */
    public function obtenerPresentacionDisponible(int $presentacionId, int $actorId, ?string $detallePersonalizacion = null): array
    {
        if ($presentacionId < 1 || $actorId < 1) {
            throw new CatalogoServiceException(422, 'PRESENTACION_INVALIDA', 'La referencia de presentación no es válida.');
        }

        $url = config('services.catalog.url');
        $clave = config('services.catalog.key');
        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            throw new CatalogoServiceException(503, 'CATALOGO_NO_CONFIGURADO', 'No se puede validar la presentación ahora.');
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
            throw new CatalogoServiceException(503, 'CATALOGO_NO_DISPONIBLE', 'No se puede validar la presentación ahora.');
        }

        if ($respuesta->status() === 404) {
            throw new CatalogoServiceException(404, 'PRESENTACION_NO_ENCONTRADA', 'La presentación no existe.');
        }

        if (!$respuesta->ok()) {
            throw new CatalogoServiceException(503, 'CATALOGO_NO_DISPONIBLE', 'No se puede validar la presentación ahora.');
        }

        $presentacion = $respuesta->json('presentacion');
        if (!$this->respuestaValida($presentacion, $presentacionId)) {
            throw new CatalogoServiceException(503, 'RESPUESTA_CATALOGO_INVALIDA', 'No se puede validar la presentación ahora.');
        }

        if (!$presentacion['disponible']) {
            throw new CatalogoServiceException(409, 'PRESENTACION_NO_DISPONIBLE', 'La presentación no está disponible para pedidos.');
        }

        if (trim($detallePersonalizacion ?? '') !== '' && !$presentacion['permite_personalizacion']) {
            throw new CatalogoServiceException(409, 'PERSONALIZACION_NO_PERMITIDA', 'Esta presentación no permite personalización.');
        }

        return [
            'presentacion_id' => $presentacionId,
            'nombre_presentacion_snapshot' => trim($presentacion['nombre']),
            'precio_unitario_snapshot' => $presentacion['precio'],
            'moneda' => 'BOB',
            'permite_personalizacion' => $presentacion['permite_personalizacion'],
        ];
    }

    private function respuestaValida(mixed $presentacion, int $presentacionId): bool
    {
        return is_array($presentacion)
            && ($presentacion['presentacion_id'] ?? null) === $presentacionId
            && is_string($presentacion['nombre'] ?? null)
            && trim($presentacion['nombre']) !== ''
            && mb_strlen(trim($presentacion['nombre'])) <= 200
            && is_string($presentacion['precio'] ?? null)
            && preg_match('/^(?:0|[1-9][0-9]{0,9})\.[0-9]{2}$/D', $presentacion['precio']) === 1
            && ($presentacion['moneda'] ?? null) === 'BOB'
            && is_bool($presentacion['disponible'] ?? null)
            && is_bool($presentacion['permite_personalizacion'] ?? null);
    }
}

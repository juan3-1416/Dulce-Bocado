<?php

namespace App\Services\Inventario;

use App\Models\Produccion;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class InventarioService
{
    public function aplicar(Produccion $produccion): array
    {
        $cliente = $this->cliente($produccion);
        if ($cliente === null) return ['estado' => 'INCIERTA'];

        $snapshot = $produccion->consumo_snapshot;
        $datos = [
            'operacion_id' => $produccion->operacion_id,
            'presentacion_id' => $produccion->presentacion_id,
            'receta_id' => $produccion->receta_id,
            'cantidad_producida' => $produccion->cantidad,
            'almacen_insumos_tipo' => 'MATERIAS_PRIMAS',
            'almacen_terminados_tipo' => 'PRODUCCION',
            'ingredientes' => $snapshot['ingredientes'],
        ];

        try {
            $respuesta = $cliente->post(
                rtrim(config('services.inventory.url'), '/').'/internal/producciones/aplicar',
                $datos,
            );
        } catch (ConnectionException) {
            return ['estado' => 'INCIERTA'];
        }

        return $this->interpretar($respuesta, $produccion->operacion_id);
    }

    public function consultar(Produccion $produccion): array
    {
        $cliente = $this->cliente($produccion);
        if ($cliente === null) return ['estado' => 'INCIERTA'];

        try {
            $respuesta = $cliente->get(
                rtrim(config('services.inventory.url'), '/').'/internal/producciones/'.$produccion->operacion_id,
            );
        } catch (ConnectionException) {
            return ['estado' => 'INCIERTA'];
        }

        if ($respuesta->status() === 404) return ['estado' => 'AUSENTE'];

        return $this->interpretar($respuesta, $produccion->operacion_id);
    }

    private function cliente(Produccion $produccion): ?PendingRequest
    {
        $url = config('services.inventory.url');
        $clave = config('services.inventory.key');
        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            return null;
        }

        return Http::timeout(max(1, (int) config('services.inventory.timeout', 3)))
            ->connectTimeout(1)
            ->acceptJson()
            ->withHeaders([
                'X-Internal-Service-Key' => $clave,
                'X-Actor-User-Id' => (string) $produccion->actor_usuario_id,
            ]);
    }

    private function interpretar(Response $respuesta, string $operacionId): array
    {
        $estado = $respuesta->json('estado');
        $id = $respuesta->json('operacion_id');
        if ($respuesta->successful() && $id === $operacionId && $estado === 'APLICADA') {
            return ['estado' => 'APLICADA'];
        }

        $codigo = $respuesta->json('error.code');
        if ($respuesta->status() === 409 && $codigo === 'STOCK_INSUFICIENTE') {
            return ['estado' => 'RECHAZADA', 'codigo' => $codigo];
        }
        if ($respuesta->status() === 422) {
            return ['estado' => 'RECHAZADA', 'codigo' => 'SOLICITUD_INVENTARIO_INVALIDA'];
        }
        if ($respuesta->successful() && $id === $operacionId && $estado === 'RECHAZADA' &&
            is_string($codigo) && $codigo !== '') {
            return ['estado' => 'RECHAZADA', 'codigo' => $codigo];
        }

        return ['estado' => 'INCIERTA'];
    }
}

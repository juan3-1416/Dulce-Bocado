<?php

namespace App\Services\Clientes;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class ClienteService
{
    /**
     * Devuelve la referencia validada; Orders no persiste datos de Customer.
     * El actor debe provenir de la introspección de Security, nunca del body.
     *
     * @return int
     */
    public function validarParaPedido(int $idCliente, int $actorId): int
    {
        if ($idCliente < 1 || $actorId < 1) {
            throw new ClienteServiceException(422, 'CLIENTE_INVALIDO', 'La referencia de cliente no es válida.');
        }

        $url = config('services.customer.url');
        $clave = config('services.customer.key');
        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            throw new ClienteServiceException(503, 'CUSTOMER_NO_CONFIGURADO', 'No se puede validar el cliente ahora.');
        }

        try {
            $respuesta = Http::timeout(max(1, (int) config('services.customer.timeout', 3)))
                ->connectTimeout(1)
                ->acceptJson()
                ->withHeaders([
                    'X-Internal-Service-Key' => $clave,
                    'X-Actor-User-Id' => (string) $actorId,
                ])
                ->get(rtrim($url, '/').'/api/clientes/'.$idCliente);
        } catch (ConnectionException) {
            throw new ClienteServiceException(503, 'CUSTOMER_NO_DISPONIBLE', 'No se puede validar el cliente ahora.');
        }

        if ($respuesta->status() === 404) {
            throw new ClienteServiceException(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente no existe.');
        }

        if (!$respuesta->ok()) {
            throw new ClienteServiceException(503, 'CUSTOMER_NO_DISPONIBLE', 'No se puede validar el cliente ahora.');
        }

        $cliente = $respuesta->json('cliente');
        if (!is_array($cliente) || ($cliente['id_cliente'] ?? null) !== $idCliente ||
            !is_bool($cliente['estado'] ?? null)) {
            throw new ClienteServiceException(503, 'RESPUESTA_CUSTOMER_INVALIDA', 'No se puede validar el cliente ahora.');
        }

        if (!$cliente['estado']) {
            throw new ClienteServiceException(409, 'CLIENTE_INACTIVO', 'El cliente está inactivo.');
        }

        return $idCliente;
    }
}

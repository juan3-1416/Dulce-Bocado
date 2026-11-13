<?php

namespace App\Services\Clientes;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class ClienteService
{
    public function validarParaPedido(
        string $tipoCliente,
        ?int $idCliente,
        ?string $nombreOcasional,
        int $actorId
    ): array {
        if ($tipoCliente === 'OCASIONAL') {
            $nombre = trim($nombreOcasional ?? '');

            if ($nombre === '') {
                throw new ClienteServiceException(
                    422,
                    'CLIENTE_OCASIONAL_REQUERIDO',
                    'Debe indicar el nombre del cliente ocasional.'
                );
            }

            return [
                'id_cliente' => null,
                'nombre_cliente_snapshot' => null,
                'nombre_cliente_ocasional' => $nombre,
            ];
        }

        if ($tipoCliente !== 'REGISTRADO' || !$idCliente || $idCliente < 1 || $actorId < 1) {
            throw new ClienteServiceException(
                422,
                'CLIENTE_INVALIDO',
                'Debe seleccionar un cliente registrado válido.'
            );
        }

        $url = config('services.customer.url');
        $clave = config('services.customer.key');

        if (!is_string($url) || $url === '' || !is_string($clave) || $clave === '') {
            throw new ClienteServiceException(
                503,
                'CUSTOMER_NO_CONFIGURADO',
                'No se puede validar el cliente ahora.'
            );
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
            throw new ClienteServiceException(
                503,
                'CUSTOMER_NO_DISPONIBLE',
                'No se puede validar el cliente ahora.'
            );
        }

        if ($respuesta->status() === 404) {
            throw new ClienteServiceException(
                404,
                'CLIENTE_NO_ENCONTRADO',
                'El cliente no existe.'
            );
        }

        if (!$respuesta->ok()) {
            throw new ClienteServiceException(
                503,
                'CUSTOMER_NO_DISPONIBLE',
                'No se puede validar el cliente ahora.'
            );
        }

        $cliente = $respuesta->json('cliente');

        if (
            !is_array($cliente) ||
            ($cliente['id_cliente'] ?? null) !== $idCliente ||
            !is_bool($cliente['estado'] ?? null) ||
            !is_string($cliente['nombre'] ?? null) ||
            trim($cliente['nombre']) === ''
        ) {
            throw new ClienteServiceException(
                503,
                'RESPUESTA_CUSTOMER_INVALIDA',
                'Customer devolvió una respuesta inválida.'
            );
        }

        if (!$cliente['estado']) {
            throw new ClienteServiceException(
                409,
                'CLIENTE_INACTIVO',
                'El cliente está inactivo.'
            );
        }

        $apellido = is_string($cliente['apellido'] ?? null)
            ? trim($cliente['apellido'])
            : '';

        $nombreCompleto = trim(
            trim($cliente['nombre']).' '.$apellido
        );

        return [
            'id_cliente' => $idCliente,
            'nombre_cliente_snapshot' => $nombreCompleto,
            'nombre_cliente_ocasional' => null,
        ];
    }
}
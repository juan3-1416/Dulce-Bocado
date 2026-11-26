<?php

namespace App\Services\Pagos;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PasarelaLibelulaService
{
    public const PROVEEDOR = 'LIBELULA';

    public function verificarPago(
        string $identificador,
        string $idTransaccion,
        string $montoEsperado,
        string $fechaInicial
    ): bool {
        return $this->buscarPagoVerificado(
            $identificador,
            $idTransaccion,
            $montoEsperado,
            $fechaInicial
        ) !== null;
    }

    public function buscarPagoVerificado(
        string $identificador,
        string $idTransaccion,
        string $montoEsperado,
        string $fechaInicial
    ): ?string {
        $appKey = config('libelula.app_key');
        $url = config('libelula.consultar_pagos_url');

        if (
            !is_string($appKey) || $appKey === '' ||
            !is_string($url) ||
            parse_url($url, PHP_URL_SCHEME) !== 'https' ||
            $identificador === ''
        ) {
            throw new PagoException(
                503,
                'CONCILIACION_NO_CONFIGURADA',
                'No se puede verificar el pago con Libelula.'
            );
        }

        try {
            $respuesta = Http::acceptJson()
                ->asJson()
                ->withoutRedirecting()
                ->connectTimeout(5)
                ->timeout(15)
                ->post($url, [
                    'appkey' => $appKey,
                    'fecha_inicial' => $fechaInicial.' 00:00:00',
                    'fecha_final' => now('America/La_Paz')
                        ->format('Y-m-d H:i:s'),
                ]);
        } catch (ConnectionException) {
            throw new PagoException(
                503,
                'CONCILIACION_NO_DISPONIBLE',
                'No se pudo consultar el pago con Libelula.'
            );
        }

        $datos = $respuesta->json();

        if (
            !$respuesta->successful() ||
            !is_array($datos) ||
            !in_array($datos['error'] ?? null, [0, '0', false], true) ||
            !is_array($datos['datos'] ?? null)
        ) {
            throw new PagoException(
                503,
                'CONCILIACION_RESPUESTA_INVALIDA',
                'Libelula no devolvio una respuesta de conciliacion valida.'
            );
        }

        $coincidencias = [];

        foreach ($datos['datos'] as $pago) {
            if (
                !is_array($pago) ||
                (string) ($pago['identificador'] ?? '') !== $identificador
            ) {
                continue;
            }

            $idProveedor = $pago['id_transaccion'] ?? null;

            if (!is_string($idProveedor) && !is_int($idProveedor)) {
                throw new PagoException(
                    503,
                    'CONCILIACION_RESPUESTA_INVALIDA',
                    'Libelula no devolvio una transaccion valida.'
                );
            }

            $idProveedor = (string) $idProveedor;

            if ($idProveedor === '') {
                throw new PagoException(
                    503,
                    'CONCILIACION_RESPUESTA_INVALIDA',
                    'La transaccion de Libelula no posee identificador.'
                );
            }

            if ($idTransaccion !== '' && $idProveedor !== $idTransaccion) {
                continue;
            }

            if (!in_array(
                $pago['pago_anulado'] ?? null,
                [false, 0, '0'],
                true
            )) {
                throw new PagoException(
                    409,
                    'PAGO_QR_ANULADO_O_NO_VERIFICABLE',
                    'El pago fue anulado o su estado no puede verificarse.'
                );
            }

            $monto = (string) ($pago['monto_pagado'] ?? '');

            if (
                !preg_match('/^\d+(?:\.\d{1,2})?$/D', $monto) ||
                bccomp($monto, $montoEsperado, 2) !== 0 ||
                strtoupper((string) ($pago['moneda'] ?? '')) !== 'BOB' ||
                empty($pago['fecha_pago'])
            ) {
                throw new PagoException(
                    409,
                    'PAGO_QR_INCONSISTENTE',
                    'El pago informado por Libelula no coincide con el cobro registrado.'
                );
            }

            $coincidencias[] = $idProveedor;
        }

        if (count($coincidencias) > 1) {
            throw new PagoException(
                409,
                'QR_CONCILIACION_AMBIGUA',
                'Existe mas de un pago coincidente. Se requiere conciliacion manual.'
            );
        }

        return $coincidencias[0] ?? null;
    }

    /**
     * Registra una deuda en Libélula y obtiene la URL del QR y la pasarela.
     */
    public function registrarDeuda(
        string $identificador,
        float $monto,
        string $nombreCliente,
        ?string $descripcion = null,
        ?string $emailCliente = null
    ): array {
        $appKey = config('libelula.app_key');
        $url = config('libelula.registrar_deuda_url');
        $callbackUrl = config('libelula.callback_url');
        $timeout = (int) config('libelula.timeout', 30);

        if (!$appKey || !is_string($appKey)) {
            throw new PagoException(
                503,
                'PASARELA_NO_CONFIGURADA',
                'La AppKey de la pasarela Libélula no está configurada.'
            );
        }

        if (!$url || !is_string($url)) {
            throw new PagoException(
                503,
                'PASARELA_NO_CONFIGURADA',
                'La URL de la pasarela Libélula no está configurada.'
            );
        }

        $montoDecimal = round($monto, 2);

        if ($montoDecimal <= 0) {
            throw new PagoException(
                422,
                'MONTO_INVALIDO',
                'El importe del pago debe ser mayor a cero.'
            );
        }

        $payload = [
            'appkey' => $appKey,
            /*
             * Este identificador lo genera Dulce Bocado.
             * Libélula posteriormente lo devuelve en el aviso como:
             * transaction_id
             */
            'identificador' => $identificador,
            'callback_url' => $callbackUrl,
            'descripcion' => $descripcion ?: 'Pago Dulce Bocado',
            'nombre_cliente' => $nombreCliente ?: 'Cliente ocasional',
            'apellido_cliente' => '',
            'email_cliente' => $emailCliente ?: 'cliente@dulcebocado.com',
            'lineas_detalle_deuda' => [
                [
                    'concepto' => $descripcion ?: 'Pago Dulce Bocado',
                    'cantidad' => 1,
                    'costo_unitario' => $montoDecimal,
                ],
            ],
        ];

        Log::info('Registrando deuda en Libélula.', [
            'identificador' => $identificador,
            'monto' => $montoDecimal,
            'url' => $url,
        ]);

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout($timeout)
                ->connectTimeout(5)
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            Log::error('Fallo de conexión al contactar a Libélula: ' . $e->getMessage());
            throw new PagoException(
                503,
                'PASARELA_NO_DISPONIBLE',
                'No se pudo conectar con la pasarela de pagos Libélula. Verifique la conexión a internet.'
            );
        }

        if (!$response->successful()) {
            Log::error('Libélula respondió con error HTTP ' . $response->status(), [
                'body' => $response->body(),
            ]);

            throw new PagoException(
                502,
                'ERROR_PASARELA_PAGO',
                'La pasarela Libélula respondió con un error HTTP ' . $response->status() . '.'
            );
        }

        $respuesta = $response->json();

        if (!is_array($respuesta)) {
            throw new PagoException(
                502,
                'RESPUESTA_PASARELA_INVALIDA',
                'La pasarela Libélula devolvió una respuesta ilegible.'
            );
        }

        if ((int) ($respuesta['error'] ?? 1) !== 0) {
            $mensajeError = $respuesta['mensaje'] ?? 'Libélula rechazó el registro de la deuda.';
            Log::warning('Libélula rechazó el registro: ' . $mensajeError, $respuesta);

            throw new PagoException(
                422,
                'PASARELA_RECHAZO_REGISTRO',
                'Libélula rechazó la creación del QR: ' . $mensajeError
            );
        }

        $idTransaccionLibelula = (string) ($respuesta['id_transaccion'] ?? '');
        $qrUrl = $respuesta['qr_simple_url'] ?? null;
        $pasarelaUrl = $respuesta['url_pasarela_pagos'] ?? null;

        if (empty($qrUrl) && empty($pasarelaUrl)) {
            throw new PagoException(
                502,
                'QR_NO_DEVUELTO',
                'Libélula no devolvió una URL para visualizar el QR de pago.'
            );
        }

        return [
            'proveedor' => self::PROVEEDOR,
            'identificador' => $identificador,
            'id_transaccion_libelula' => $idTransaccionLibelula,
            'codigo_recaudacion' => $respuesta['codigo_recaudacion'] ?? null,
            'qr_simple_url' => $qrUrl,
            'url_pasarela_pagos' => $pasarelaUrl,
            'monto_total' => isset($respuesta['monto_total']) ? (float) $respuesta['monto_total'] : $montoDecimal,
            'raw_respuesta' => $respuesta,
        ];
    }
}

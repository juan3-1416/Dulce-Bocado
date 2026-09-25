<?php

namespace App\Services\PagosInternet;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PasarelaLibelula
{
    public const PROVEEDOR =
        'LIBELULA';

    /**
     * Registra una deuda en Libélula.
     */
    public function registrarDeuda(
        string $identificador,
        float $monto,
        string $nombreCliente,
        ?string $apellidoCliente = null,
        ?string $emailCliente = null,
        ?string $descripcion = null
    ): array {
        $appKey =
            config('libelula.app_key');

        $url =
            config(
                'libelula.registrar_deuda_url'
            );

        $callbackUrl =
            config(
                'libelula.callback_url'
            );

        if (!$appKey) {
            throw new RuntimeException(
                'La AppKey de Libélula no está configurada.'
            );
        }

        if (!$url) {
            throw new RuntimeException(
                'La URL de registro de deuda de Libélula no está configurada.'
            );
        }

        if (!$callbackUrl) {
            throw new RuntimeException(
                'La URL de aviso de Libélula no está configurada.'
            );
        }

        $monto =
            round(
                $monto,
                2
            );

        if ($monto <= 0) {
            throw new RuntimeException(
                'El monto de la deuda debe ser mayor a cero.'
            );
        }

        $payload = [
            'appkey' =>
                $appKey,

            /*
             * Este identificador lo genera
             * Dulce Bocado.
             *
             * Libélula posteriormente lo
             * devuelve en el aviso como:
             *
             * transaction_id
             */
            'identificador' =>
                $identificador,

            'callback_url' =>
                $callbackUrl,

            'descripcion' =>
                $descripcion
                ?: 'Pago Dulce Bocado',

            'nombre_cliente' =>
                $nombreCliente,

            'apellido_cliente' =>
                $apellidoCliente
                ?: '',

            'email_cliente' =>
                $emailCliente
                ?: 'pruebas@dulcebocado.com',

            'lineas_detalle_deuda' => [
                [
                    'concepto' =>
                        $descripcion
                        ?: 'Pago Dulce Bocado',

                    'cantidad' =>
                        1,

                    'costo_unitario' =>
                        $monto,
                ],
            ],
        ];

        $response =
            Http::acceptJson()
                ->asJson()
                ->timeout(30)
                ->post(
                    $url,
                    $payload
                );

        if (!$response->successful()) {
            throw new RuntimeException(
                'Libélula respondió con HTTP ' .
                $response->status() .
                '.'
            );
        }

        $respuesta =
            $response->json();

        if (!is_array($respuesta)) {
            throw new RuntimeException(
                'Libélula devolvió una respuesta inválida.'
            );
        }

        if (
            (int) (
                $respuesta['error']
                ?? 1
            ) !== 0
        ) {
            throw new RuntimeException(
                $respuesta['mensaje']
                ?? 'Libélula rechazó el registro de la deuda.'
            );
        }

        if (
            empty(
                $respuesta[
                    'id_transaccion'
                ]
            )
        ) {
            throw new RuntimeException(
                'Libélula no devolvió id_transaccion.'
            );
        }

        if (
            empty(
                $respuesta[
                    'qr_simple_url'
                ]
            )
            &&
            empty(
                $respuesta[
                    'url_pasarela_pagos'
                ]
            )
        ) {
            throw new RuntimeException(
                'Libélula no devolvió un QR ni una URL de pago.'
            );
        }

        return [
            'proveedor' =>
                self::PROVEEDOR,

            /*
             * Referencia creada por nosotros.
             */
            'referencia_transaccion' =>
                $identificador,

            /*
             * UUID interno retornado por
             * Libélula.
             */
            'id_transaccion_libelula' =>
                $respuesta[
                    'id_transaccion'
                ],

            'codigo_recaudacion' =>
                $respuesta[
                    'codigo_recaudacion'
                ] ?? null,

            'qr_simple_url' =>
                $respuesta[
                    'qr_simple_url'
                ] ?? null,

            'url_pasarela_pagos' =>
                $respuesta[
                    'url_pasarela_pagos'
                ] ?? null,

            'monto_total' =>
                isset(
                    $respuesta[
                        'monto_total'
                    ]
                )
                    ? (float)
                        $respuesta[
                            'monto_total'
                        ]
                    : $monto,

            /*
             * Guardaremos la respuesta
             * completa para auditoría.
             *
             * qr_simple_base64 se elimina
             * porque es enorme y no lo
             * necesitamos para mostrar el QR.
             */
            'respuesta_proveedor' =>
                collect(
                    $respuesta
                )
                    ->except(
                        'qr_simple_base64'
                    )
                    ->all(),
        ];
    }
}
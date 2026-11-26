<?php

return [
    'app_key' => env('LIBELULA_APP_KEY'),

    'registrar_deuda_url' => env(
        'LIBELULA_REGISTRAR_DEUDA_URL',
        'https://api.libelula.bo/rest/deuda/registrar'
    ),

    'callback_url' => env('LIBELULA_CALLBACK_URL'),

    'consultar_pagos_url' => env(
        'LIBELULA_CONSULTAR_PAGOS_URL',
        'https://api.libelula.bo/rest/deuda/consultar_pagos'
    ),

    'timeout' => (int) env(
        'LIBELULA_TIMEOUT',
        30
    ),
];

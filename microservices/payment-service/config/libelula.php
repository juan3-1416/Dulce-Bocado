<?php

return [
    'app_key' => env(
        'LIBELULA_APP_KEY',
        '11bb10ce-68ba-4af1-8eb7-4e6624fed729'
    ),

    'registrar_deuda_url' => env(
        'LIBELULA_REGISTRAR_DEUDA_URL',
        'https://api.libelula.bo/rest/deuda/registrar'
    ),

    'callback_url' => env(
        'LIBELULA_CALLBACK_URL',
        'http://localhost:8080/api/pagos/qr/callback'
    ),

    'timeout' => (int) env(
        'LIBELULA_TIMEOUT',
        30
    ),
];

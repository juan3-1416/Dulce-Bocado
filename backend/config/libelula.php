<?php

return [
    'app_key' =>
        env('LIBELULA_APP_KEY'),

    'registrar_deuda_url' =>
        env(
            'LIBELULA_REGISTRAR_DEUDA_URL',
            'https://api.libelula.bo/rest/deuda/registrar'
        ),

    'callback_url' =>
        env('LIBELULA_CALLBACK_URL'),
];
<?php

return [
    'default' => env('MAIL_MAILER', 'smtp'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', 'mailpit'),
            'port' => env('MAIL_PORT', 1025),
            'encryption' => env('MAIL_ENCRYPTION', null),
            'username' => env('MAIL_USERNAME', null),
            'password' => env('MAIL_PASSWORD', null),
            ...(
                env('MAIL_HOST') === '192.168.1.32'
                && (int) env('MAIL_PORT') === 25
                ? [
                    'verify_peer' => false,
                    'peer_fingerprint' => [
                        'sha256' => '389eba5de4fae5a4ab7591120fa22656faf9400542022d09b08869fb74e6bbd4',
                    ],
                    'require_tls' => true,
                ]
                : []
            ),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],
        'gmail' => [
            'transport' => 'smtp',
            'scheme' => 'smtp',
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'username' => env('MAIL_GMAIL_USERNAME'),
            'password' => env('MAIL_GMAIL_PASSWORD'),
            'verify_peer' => true,
            'require_tls' => true,
            'timeout' => 20,
            'from' => [
                'address' => env('MAIL_GMAIL_FROM_ADDRESS'),
                'name' => env('MAIL_FROM_NAME', 'Dulce Bocado'),
            ],
        ],
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'reportes@dulcebocado.com'),
        'name' => env('MAIL_FROM_NAME', 'Dulce Bocado'),
    ],
];

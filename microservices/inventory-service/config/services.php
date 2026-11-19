<?php

return [
    'inventory_sales' => [
        'key' => env('INVENTORY_SALES_KEY'),
    ],
    'security' => [
        'url' => env(
            'SECURITY_SERVICE_URL',
            'http://security-service:8000'
        ),
        'key' => env('INTERNAL_SERVICE_KEY'),
        'timeout' => (int) env(
            'SECURITY_TIMEOUT',
            3
        ),
    ],

    'catalog' => [
        'url' => env(
            'CATALOGO_SERVICE_URL',
            'http://catalog-service:8000'
        ),
        'key' => env('CATALOGO_SERVICE_KEY'),
        'timeout' => (int) env(
            'CATALOGO_TIMEOUT',
            3
        ),
    ],

    'inventory_internal' => [
        'key' => env('INVENTORY_INTERNAL_KEY'),
    ],
];

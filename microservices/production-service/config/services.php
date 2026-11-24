<?php

return [
    'security' => [
        'url' => env('SECURITY_SERVICE_URL', 'http://security-service:8000'),
        'key' => env('INTERNAL_SERVICE_KEY'),
        'timeout' => (int) env('SECURITY_TIMEOUT', 3),
    ],
    'catalog' => [
        'url' => env('CATALOGO_SERVICE_URL', env('CATALOG_SERVICE_URL', 'http://catalog-service:8000')),
        'key' => env('CATALOGO_SERVICE_KEY', env('CATALOG_INTERNAL_KEY', env('INTERNAL_SERVICE_KEY'))),
        'timeout' => (int) env('CATALOGO_TIMEOUT', 3),
    ],
    'inventory' => [
        'url' => env('INVENTORY_SERVICE_URL', 'http://inventory-service:8000'),
        'key' => env('INVENTORY_SERVICE_KEY', env('INTERNAL_SERVICE_KEY')),
        'timeout' => (int) env('INVENTORY_TIMEOUT', 3),
    ],
];

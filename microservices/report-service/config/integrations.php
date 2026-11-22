<?php

return [
    'security' => [
        'url' => env('SECURITY_SERVICE_URL', 'http://security-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('SECURITY_SERVICE_TIMEOUT', 4),
    ],
    'sales' => [
        'url' => env('SALES_SERVICE_URL', 'http://sales-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('SALES_SERVICE_TIMEOUT', 4),
    ],
    'orders' => [
        'url' => env('ORDER_SERVICE_URL', 'http://order-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('ORDER_SERVICE_TIMEOUT', 4),
    ],
    'inventory' => [
        'url' => env('INVENTORY_SERVICE_URL', 'http://inventory-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('INVENTORY_SERVICE_TIMEOUT', 4),
    ],
    'production' => [
        'url' => env('PRODUCTION_SERVICE_URL', 'http://production-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('PRODUCTION_SERVICE_TIMEOUT', 4),
    ],
    'payments' => [
        'url' => env('PAYMENT_SERVICE_URL', 'http://payment-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('PAYMENT_SERVICE_TIMEOUT', 4),
    ],
    'catalog' => [
        'url' => env('CATALOG_SERVICE_URL', 'http://catalog-service:8000'),
        'key' => env('INTERNAL_SERVICES_KEY', 'clave_interna_compartida_dulce_bocado_2026'),
        'timeout' => (int) env('CATALOG_SERVICE_TIMEOUT', 4),
    ],
];

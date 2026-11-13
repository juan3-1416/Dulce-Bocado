<?php

return [

    'security' => [
        'url' => env('SECURITY_SERVICE_URL', 'http://security-service:8000'),
        'key' => env('INTERNAL_SERVICE_KEY'),
        'timeout' => (int) env('SECURITY_TIMEOUT', 3),
    ],

    'customer' => [
        'url' => env('CUSTOMER_SERVICE_URL', 'http://customer-service:8000'),
        'key' => env('CUSTOMER_SERVICE_KEY'),
        'timeout' => (int) env('CUSTOMER_TIMEOUT', 3),
    ],

    'catalog' => [
        'url' => env('CATALOGO_SERVICE_URL', 'http://catalog-service:8000'),
        'key' => env('CATALOGO_SERVICE_KEY'),
        'timeout' => (int) env('CATALOGO_TIMEOUT', 3),
    ],

];
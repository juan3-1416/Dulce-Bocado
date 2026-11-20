<?php

return [
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

    'sales' => [
        'url' => env(
            'SALES_SERVICE_URL',
            'http://sales-service:8000'
        ),
        'timeout' => (int) env(
            'SALES_TIMEOUT',
            3
        ),
    ],

    'orders' => [
        'url' => env(
            'ORDER_SERVICE_URL',
            'http://order-service:8000'
        ),
        'timeout' => (int) env(
            'ORDER_TIMEOUT',
            3
        ),
    ],

    'customer' => [
        'url' => env(
            'CUSTOMER_SERVICE_URL',
            'http://customer-service:8000'
        ),
        'key' => env('INTERNAL_SERVICE_KEY'),
        'timeout' => (int) env(
            'CUSTOMER_TIMEOUT',
            3
        ),
    ],
];
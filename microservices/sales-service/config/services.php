<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

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

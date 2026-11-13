<?php

$method = $argv[1] ?? 'GET';
$path = $argv[2] ?? '/api/pedidos';
$payloadFile = $argv[3] ?? null;
$token = getenv('TEST_TOKEN');

$body = null;

if ($payloadFile !== null && $payloadFile !== '') {
    if (!is_file($payloadFile)) {
        fwrite(STDERR, "Payload no encontrado: {$payloadFile}\n");
        exit(2);
    }

    $body = file_get_contents($payloadFile);
}

$headers = [
    'Accept: application/json',
];

if ($token !== false && $token !== '') {
    $headers[] = 'Authorization: Bearer '.$token;
}

if ($body !== null) {
    $headers[] = 'Content-Type: application/json';
}

$context = stream_context_create([
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $body ?? '',
        'ignore_errors' => true,
    ],
]);

$response = file_get_contents(
    'http://127.0.0.1:8000'.$path,
    false,
    $context
);

echo ($http_response_header[0] ?? 'SIN_STATUS').PHP_EOL;
echo $response.PHP_EOL;
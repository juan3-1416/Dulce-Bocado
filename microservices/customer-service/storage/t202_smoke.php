<?php

function request(
    string $method,
    string $url,
    ?array $body = null
): array {
    $headers = [
        'Accept: application/json',
    ];

    $options = [
        'method' => $method,
        'ignore_errors' => true,
    ];

    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $options['content'] = json_encode($body);
    }

    $options['header'] = implode("\r\n", $headers);

    $context = stream_context_create([
        'http' => $options,
    ]);

    $response = file_get_contents(
        $url,
        false,
        $context
    );

    return [
        'status' => $http_response_header[0] ?? 'SIN STATUS',
        'body' => $response,
    ];
}

echo "=== PUT /api/clientes/1 ===\n";

$actualizar = request(
    'PUT',
    'http://127.0.0.1:8000/api/clientes/1',
    [
        'nombre' => 'Cliente Prueba T202 Modificado',
        'apellido' => 'Temporal',
        'ci_nit' => 'T202-001',
        'telefono' => '70000002',
        'correo_electronico' => 'cliente.t202@prueba.local',
        'direccion' => 'Direccion modificada',
        'observaciones' => 'Cliente actualizado durante T202.',
        'estado' => true,
    ]
);

echo $actualizar['status'] . "\n";
echo $actualizar['body'] . "\n\n";

echo "=== PATCH /api/clientes/1/estado -> false ===\n";

$desactivar = request(
    'PATCH',
    'http://127.0.0.1:8000/api/clientes/1/estado',
    [
        'estado' => false,
    ]
);

echo $desactivar['status'] . "\n";
echo $desactivar['body'] . "\n\n";

echo "=== GET /api/clientes/1 ===\n";

$detalle = request(
    'GET',
    'http://127.0.0.1:8000/api/clientes/1'
);

echo $detalle['status'] . "\n";
echo $detalle['body'] . "\n";
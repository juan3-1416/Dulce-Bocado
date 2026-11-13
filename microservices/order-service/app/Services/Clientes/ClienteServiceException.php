<?php

namespace App\Services\Clientes;

use RuntimeException;

class ClienteServiceException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
    ) {
        parent::__construct($mensaje);
    }
}
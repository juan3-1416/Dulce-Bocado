<?php

namespace App\Services\Produccion;

use RuntimeException;

class ProduccionException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
    ) {
        parent::__construct($mensaje);
    }
}

<?php

namespace App\Services\Pagos;

use RuntimeException;

class PagoException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
        public readonly array $detalles = [],
    ) {
        parent::__construct($mensaje);
    }
}
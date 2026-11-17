<?php

namespace App\Services\Inventario;

use RuntimeException;

class InventarioException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
        public readonly array $details = [],
    ) {
        parent::__construct($mensaje);
    }
}
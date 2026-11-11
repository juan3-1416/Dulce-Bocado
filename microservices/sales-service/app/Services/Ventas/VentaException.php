<?php

namespace App\Services\Ventas;

use RuntimeException;

class VentaException extends RuntimeException
{
    public function __construct(public readonly int $httpStatus, public readonly string $codigo, string $mensaje)
    {
        parent::__construct($mensaje);
    }
}

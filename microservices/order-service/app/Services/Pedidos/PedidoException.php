<?php

namespace App\Services\Pedidos;

use RuntimeException;

class PedidoException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
    ) {
        parent::__construct($mensaje);
    }
}
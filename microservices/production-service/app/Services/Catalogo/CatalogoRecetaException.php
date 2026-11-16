<?php

namespace App\Services\Catalogo;

use RuntimeException;

class CatalogoRecetaException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $codigo,
        string $mensaje,
    ) {
        parent::__construct($mensaje);
    }
}

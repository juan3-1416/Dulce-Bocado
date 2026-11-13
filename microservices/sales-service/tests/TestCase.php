<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        foreach (['DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => ':memory:', 'DB_URL' => ''] as $nombre => $valor) {
            putenv("{$nombre}={$valor}");
            $_ENV[$nombre] = $valor;
            $_SERVER[$nombre] = $valor;
        }

        if (getenv('DB_CONNECTION') !== 'sqlite' || getenv('DB_DATABASE') !== ':memory:') {
            throw new \RuntimeException('La suite de Sales solo puede ejecutarse con SQLite en memoria.');
        }

        parent::setUp();
    }
}

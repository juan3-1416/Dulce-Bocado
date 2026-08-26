<?php

namespace App\Services\Auth;

use App\Models\Usuario;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public const MAX_INTENTOS = 5;
    public const MINUTOS_BLOQUEO = 15;

    public function intentarLogin(
        string $nombreUsuario,
        string $contrasena
    ): array {
        return DB::transaction(function () use ($nombreUsuario, $contrasena) {
            $usuario = Usuario::where('nombre_usuario', $nombreUsuario)
                ->lockForUpdate()
                ->first();

            if (!$usuario) {
                return [
                    'estado' => 'credenciales_invalidas',
                ];
            }

            if (!$usuario->activo) {
                return [
                    'estado' => 'inactivo',
                ];
            }

            if (
                $usuario->bloqueado_hasta !== null &&
                now()->lt($usuario->bloqueado_hasta)
            ) {
                return [
                    'estado' => 'bloqueado',
                    'bloqueado_hasta' => $usuario->bloqueado_hasta,
                ];
            }

            if (
                $usuario->bloqueado_hasta !== null &&
                now()->gte($usuario->bloqueado_hasta)
            ) {
                $usuario->intentos_fallidos = 0;
                $usuario->bloqueado_hasta = null;
                $usuario->save();
            }

            if (!Hash::check($contrasena, $usuario->contrasena)) {
                $usuario->intentos_fallidos++;

                if ($usuario->intentos_fallidos >= self::MAX_INTENTOS) {
                    $usuario->bloqueado_hasta = now()
                        ->addMinutes(self::MINUTOS_BLOQUEO);

                    $usuario->save();

                    return [
                        'estado' => 'bloqueado',
                        'bloqueado_hasta' => $usuario->bloqueado_hasta,
                    ];
                }

                $usuario->save();

                return [
                    'estado' => 'credenciales_invalidas',
                    'intentos_restantes' => max(
                        0,
                        self::MAX_INTENTOS - $usuario->intentos_fallidos
                    ),
                ];
            }

            $usuario->intentos_fallidos = 0;
            $usuario->bloqueado_hasta = null;
            $usuario->save();

            return [
                'estado' => 'ok',
                'usuario' => $usuario,
            ];
        });
    }
}
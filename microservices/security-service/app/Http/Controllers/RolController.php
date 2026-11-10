<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $roles = Rol::query()
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'roles' => $roles,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:60',
                'unique:roles,nombre',
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255',
            ],
            'activo' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $rol = Rol::create([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'activo' => $datos['activo'] ?? true,
        ]);

        return response()->json([
            'message' => 'Rol registrado correctamente.',
            'rol' => $rol,
        ], 201);
    }

    public function show(
        Request $request,
        Rol $rol
    ): JsonResponse {
        $this->autorizar($request);

        return response()->json([
            'rol' => $rol,
        ]);
    }

    public function update(
        Request $request,
        Rol $rol
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:60',
                Rule::unique('roles', 'nombre')
                    ->ignore(
                        $rol->id_rol,
                        'id_rol'
                    ),
            ],
            'descripcion' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $rol->update($datos);

        return response()->json([
            'message' => 'Rol actualizado correctamente.',
            'rol' => $rol->fresh(),
        ]);
    }

    public function cambiarEstado(
        Request $request,
        Rol $rol
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'activo' => [
                'required',
                'boolean',
            ],
        ]);

        if (
            $rol->nombre === 'Administrador' &&
            $datos['activo'] === false
        ) {
            return response()->json([
                'message' =>
                    'El rol Administrador no puede desactivarse.',
            ], 422);
        }

        $rol->update([
            'activo' => $datos['activo'],
        ]);

        return response()->json([
            'message' => $datos['activo']
                ? 'Rol activado correctamente.'
                : 'Rol desactivado correctamente.',
            'rol' => $rol->fresh(),
        ]);
    }

    private function autorizar(Request $request): void
    {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (
            !$usuario ||
            !$usuario->tienePermiso(
                'seguridad.gestionar_rol'
            )
        ) {
            abort(
                403,
                'No tiene permiso para gestionar roles.'
            );
        }
    }
}
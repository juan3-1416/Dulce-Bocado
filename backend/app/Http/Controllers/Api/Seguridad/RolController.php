<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StoreRolRequest;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Seguridad\UpdateRolRequest;
use App\Http\Requests\Seguridad\UpdateEstadoRolRequest;

class RolController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Rol::query()
            ->orderBy('id_rol')
            ->get([
                'id_rol',
                'nombre',
                'descripcion',
                'activo',
            ]);

        return response()->json([
            'roles' => $roles,
        ]);
    }

    public function show(int $id): JsonResponse
{
    $rol = Rol::find($id);

    if (!$rol) {
        return response()->json([
            'message' => 'Rol no encontrado.',
        ], 404);
    }

    return response()->json([
        'rol' => [
            'id_rol' => $rol->id_rol,
            'nombre' => $rol->nombre,
            'descripcion' => $rol->descripcion,
            'activo' => $rol->activo,
        ],
    ]);
}

    public function store(
        StoreRolRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $rol = Rol::create([
            'nombre' => trim($datos['nombre']),
            'descripcion' => isset($datos['descripcion'])
                ? trim($datos['descripcion'])
                : null,
            'activo' => true,
        ]);

        return response()->json([
            'message' => 'Rol registrado correctamente.',
            'rol' => [
                'id_rol' => $rol->id_rol,
                'nombre' => $rol->nombre,
                'descripcion' => $rol->descripcion,
                'activo' => $rol->activo,
            ],
        ], 201);
    }
    public function update(
    UpdateRolRequest $request,
    int $id
): JsonResponse {
    $rol = Rol::find($id);

    if (!$rol) {
        return response()->json([
            'message' => 'Rol no encontrado.',
        ], 404);
    }

    $datos = $request->validated();

    $rol->nombre = trim($datos['nombre']);

    $rol->descripcion = isset($datos['descripcion'])
        ? trim($datos['descripcion'])
        : null;

    $rol->save();

    return response()->json([
        'message' => 'Rol actualizado correctamente.',
        'rol' => [
            'id_rol' => $rol->id_rol,
            'nombre' => $rol->nombre,
            'descripcion' => $rol->descripcion,
            'activo' => $rol->activo,
        ],
    ]);
}
public function updateEstado(
    UpdateEstadoRolRequest $request,
    int $id
): JsonResponse {
    $rol = Rol::find($id);

    if (!$rol) {
        return response()->json([
            'message' => 'Rol no encontrado.',
        ], 404);
    }

    $rol->activo = $request->validated()['activo'];
    $rol->save();

    return response()->json([
        'message' => $rol->activo
            ? 'Rol activado correctamente.'
            : 'Rol desactivado correctamente.',

        'rol' => [
            'id_rol' => $rol->id_rol,
            'nombre' => $rol->nombre,
            'descripcion' => $rol->descripcion,
            'activo' => $rol->activo,
        ],
    ]);
}
    
}
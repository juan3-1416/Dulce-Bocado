<?php

namespace App\Http\Controllers\Api\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StorePermisoRequest;
use App\Models\Permiso;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Seguridad\UpdatePermisoRequest;
use App\Http\Requests\Seguridad\UpdateEstadoPermisoRequest;
class PermisoController extends Controller
{
    public function index(): JsonResponse
    {
        $permisos = Permiso::query()
            ->orderBy('id_permiso')
            ->get([
                'id_permiso',
                'nombre',
                'descripcion',
                'activo',
            ]);

        return response()->json([
            'permisos' => $permisos,
        ]);
    }

    public function show(int $id): JsonResponse
{
    $permiso = Permiso::find($id);

    if (!$permiso) {
        return response()->json([
            'message' => 'Permiso no encontrado.',
        ], 404);
    }

    return response()->json([
        'permiso' => [
            'id_permiso' => $permiso->id_permiso,
            'nombre' => $permiso->nombre,
            'descripcion' => $permiso->descripcion,
            'activo' => $permiso->activo,
        ],
    ]);
}

    public function store(
        StorePermisoRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $permiso = Permiso::create([
            'nombre' => trim($datos['nombre']),
            'descripcion' => isset($datos['descripcion'])
                ? trim($datos['descripcion'])
                : null,
            'activo' => true,
        ]);

        return response()->json([
            'message' => 'Permiso registrado correctamente.',
            'permiso' => [
                'id_permiso' => $permiso->id_permiso,
                'nombre' => $permiso->nombre,
                'descripcion' => $permiso->descripcion,
                'activo' => $permiso->activo,
            ],
        ], 201);
    }
    public function update(
    UpdatePermisoRequest $request,
    int $id
): JsonResponse {
    $permiso = Permiso::find($id);

    if (!$permiso) {
        return response()->json([
            'message' => 'Permiso no encontrado.',
        ], 404);
    }

    $datos = $request->validated();

    $permiso->nombre = trim($datos['nombre']);

    $permiso->descripcion = isset($datos['descripcion'])
        ? trim($datos['descripcion'])
        : null;

    $permiso->save();

    return response()->json([
        'message' => 'Permiso actualizado correctamente.',
        'permiso' => [
            'id_permiso' => $permiso->id_permiso,
            'nombre' => $permiso->nombre,
            'descripcion' => $permiso->descripcion,
            'activo' => $permiso->activo,
        ],
    ]);
}
public function updateEstado(
    UpdateEstadoPermisoRequest $request,
    int $id
): JsonResponse {
    $permiso = Permiso::find($id);

    if (!$permiso) {
        return response()->json([
            'message' => 'Permiso no encontrado.',
        ], 404);
    }

    $permiso->activo = $request->validated()['activo'];
    $permiso->save();

    return response()->json([
        'message' => $permiso->activo
            ? 'Permiso activado correctamente.'
            : 'Permiso desactivado correctamente.',

        'permiso' => [
            'id_permiso' => $permiso->id_permiso,
            'nombre' => $permiso->nombre,
            'descripcion' => $permiso->descripcion,
            'activo' => $permiso->activo,
        ],
    ]);
}
}
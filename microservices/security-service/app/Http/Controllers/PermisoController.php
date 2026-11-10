<?php

namespace App\Http\Controllers;

use App\Models\Permiso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PermisoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $permisos = Permiso::query()
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'permisos' => $permisos,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                'unique:permisos,nombre',
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

        $permiso = Permiso::create([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'activo' => $datos['activo'] ?? true,
        ]);

        return response()->json([
            'message' => 'Permiso registrado correctamente.',
            'permiso' => $permiso,
        ], 201);
    }

    public function show(
        Request $request,
        Permiso $permiso
    ): JsonResponse {
        $this->autorizar($request);

        return response()->json([
            'permiso' => $permiso,
        ]);
    }

    public function update(
        Request $request,
        Permiso $permiso
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('permisos', 'nombre')
                    ->ignore(
                        $permiso->id_permiso,
                        'id_permiso'
                    ),
            ],
            'descripcion' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $permiso->update($datos);

        return response()->json([
            'message' =>
                'Permiso actualizado correctamente.',
            'permiso' => $permiso->fresh(),
        ]);
    }

    public function cambiarEstado(
        Request $request,
        Permiso $permiso
    ): JsonResponse {
        $this->autorizar($request);

        $datos = $request->validate([
            'activo' => [
                'required',
                'boolean',
            ],
        ]);

        $permiso->update([
            'activo' => $datos['activo'],
        ]);

        return response()->json([
            'message' => $datos['activo']
                ? 'Permiso activado correctamente.'
                : 'Permiso desactivado correctamente.',
            'permiso' => $permiso->fresh(),
        ]);
    }

    private function autorizar(Request $request): void
    {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (
            !$usuario ||
            !$usuario->tienePermiso(
                'seguridad.gestionar_permiso'
            )
        ) {
            abort(
                403,
                'No tiene permiso para gestionar permisos.'
            );
        }
    }
}
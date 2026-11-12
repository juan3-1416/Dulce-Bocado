<?php

namespace App\Http\Controllers\Api\Clientes;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clientes\StoreClienteRequest;
use App\Http\Requests\Clientes\UpdateClienteRequest;
use App\Http\Requests\Clientes\UpdateEstadoClienteRequest;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $query = Cliente::query();

        $buscar = trim(
            (string) $request->query(
                'buscar',
                ''
            )
        );

        if ($buscar !== '') {
            $query->where(
                function ($subquery) use ($buscar) {
                    $patron = "%{$buscar}%";

                    $subquery
                        ->where(
                            'nombre',
                            'ilike',
                            $patron
                        )
                        ->orWhere(
                            'apellido',
                            'ilike',
                            $patron
                        )
                        ->orWhere(
                            'ci_nit',
                            'ilike',
                            $patron
                        )
                        ->orWhere(
                            'telefono',
                            'ilike',
                            $patron
                        )
                        ->orWhere(
                            'correo_electronico',
                            'ilike',
                            $patron
                        )
                        ->orWhere(
                            'direccion',
                            'ilike',
                            $patron
                        );
                }
            );
        }

        $estado =
            $request->query('estado');

        if (
            $estado === '1' ||
            $estado === 1 ||
            $estado === true
        ) {
            $query->where(
                'estado',
                true
            );
        } elseif (
            $estado === '0' ||
            $estado === 0 ||
            $estado === false
        ) {
            $query->where(
                'estado',
                false
            );
        }

        $clientes = $query
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get();

        return response()->json([
            'clientes' => $clientes,
        ]);
    }

    public function store(
        StoreClienteRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        $datos['estado'] =
            $datos['estado'] ?? true;

        $cliente =
            Cliente::create($datos);

        return response()->json([
            'message' =>
                'Cliente registrado correctamente.',
            'cliente' => $cliente,
        ], 201);
    }

    public function show(
        int $id
    ): JsonResponse {
        $cliente =
            Cliente::find($id);

        if (!$cliente) {
            return response()->json([
                'message' =>
                    'Cliente no encontrado.',
                'code' =>
                    'CLIENTE_NO_ENCONTRADO',
            ], 404);
        }

        return response()->json([
            'cliente' => $cliente,
        ]);
    }

    public function update(
        UpdateClienteRequest $request,
        int $id
    ): JsonResponse {
        $cliente =
            Cliente::find($id);

        if (!$cliente) {
            return response()->json([
                'message' =>
                    'Cliente no encontrado.',
                'code' =>
                    'CLIENTE_NO_ENCONTRADO',
            ], 404);
        }

        $cliente->fill(
            $request->validated()
        );

        $cliente->save();

        return response()->json([
            'message' =>
                'Cliente actualizado correctamente.',
            'cliente' =>
                $cliente->fresh(),
        ]);
    }

    public function updateEstado(
        UpdateEstadoClienteRequest $request,
        int $id
    ): JsonResponse {
        $cliente =
            Cliente::find($id);

        if (!$cliente) {
            return response()->json([
                'message' =>
                    'Cliente no encontrado.',
                'code' =>
                    'CLIENTE_NO_ENCONTRADO',
            ], 404);
        }

        $cliente->estado =
            $request->boolean(
                'estado'
            );

        $cliente->save();

        return response()->json([
            'message' =>
                $cliente->estado
                    ? 'Cliente activado correctamente.'
                    : 'Cliente desactivado correctamente.',
            'cliente' =>
                $cliente->fresh(),
        ]);
    }
}
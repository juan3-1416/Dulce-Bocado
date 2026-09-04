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
    public function index(Request $request): JsonResponse
    {
        $query = Cliente::query()->orderBy('id_cliente', 'desc');

        if ($request->filled('buscar')) {
            $buscar = trim($request->query('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre', 'ilike', "%{$buscar}%")
                  ->orWhere('apellido', 'ilike', "%{$buscar}%")
                  ->orWhere('ci_nit', 'ilike', "%{$buscar}%")
                  ->orWhere('telefono', 'ilike', "%{$buscar}%")
                  ->orWhere('direccion', 'ilike', "%{$buscar}%")
                  ->orWhere('correo_electronico', 'ilike', "%{$buscar}%");
            });
        }

        if ($request->has('estado') && $request->query('estado') !== '') {
            $query->where('estado', $request->boolean('estado'));
        }

        return response()->json([
            'clientes' => $query->get(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        return response()->json([
            'cliente' => $cliente,
        ]);
    }

    public function store(StoreClienteRequest $request): JsonResponse
    {
        $cliente = Cliente::create($request->validated());

        return response()->json([
            'cliente' => $cliente,
            'message' => 'Cliente registrado exitosamente.',
        ], 201);
    }

    public function update(UpdateClienteRequest $request, int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update($request->validated());

        return response()->json([
            'cliente' => $cliente,
            'message' => 'Cliente actualizado exitosamente.',
        ]);
    }

    public function updateEstado(UpdateEstadoClienteRequest $request, int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->estado = $request->boolean('estado');
        $cliente->save();

        return response()->json([
            'cliente' => $cliente,
            'message' => 'Estado del cliente actualizado exitosamente.',
        ]);
    }
}

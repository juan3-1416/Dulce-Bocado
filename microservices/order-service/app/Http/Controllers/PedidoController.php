<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarEstadoPedidoRequest;
use App\Http\Requests\GuardarPedidoRequest;
use App\Models\Pedido;
use App\Services\Pedidos\PedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pedido::query()->with('detalles');

        if ($request->filled('estado')) {
            $query->where(
                'estado',
                $request->string('estado')->toString()
            );
        }

        if ($request->filled('fecha_entrega')) {
            $query->whereDate(
                'fecha_entrega',
                $request->string('fecha_entrega')->toString()
            );
        }

        if ($request->filled('buscar')) {
            $texto = trim(
                $request->string('buscar')->toString()
            );

            $query->where(function ($sub) use ($texto) {
                $sub->where(
                    'nombre_cliente_snapshot',
                    'ILIKE',
                    '%'.$texto.'%'
                )->orWhere(
                    'nombre_cliente_ocasional',
                    'ILIKE',
                    '%'.$texto.'%'
                );

                if (ctype_digit($texto)) {
                    $sub->orWhere(
                        'id_pedido',
                        (int) $texto
                    );
                }
            });
        }

        return response()->json([
            'pedidos' => $query
                ->orderByDesc('id_pedido')
                ->get(),
        ]);
    }

    public function show(Pedido $pedido): JsonResponse
    {
        return response()->json([
            'pedido' => $pedido->load('detalles'),
        ]);
    }

    public function store(
        GuardarPedidoRequest $request,
        PedidoService $service
    ): JsonResponse {
        $pedido = $service->crear(
            $request->validated(),
            (int) $request->attributes->get(
                'id_usuario_autenticado'
            )
        );

        return response()->json([
            'message' =>
                'Pedido registrado correctamente.',
            'pedido' => $pedido,
        ], 201);
    }

    public function update(
        GuardarPedidoRequest $request,
        Pedido $pedido,
        PedidoService $service
    ): JsonResponse {
        $pedido = $service->actualizar(
            $pedido,
            $request->validated(),
            (int) $request->attributes->get(
                'id_usuario_autenticado'
            )
        );

        return response()->json([
            'message' =>
                'Pedido actualizado correctamente.',
            'pedido' => $pedido,
        ]);
    }

    public function cambiarEstado(
        CambiarEstadoPedidoRequest $request,
        Pedido $pedido,
        PedidoService $service
    ): JsonResponse {
        $pedido = $service->cambiarEstado(
            $pedido,
            $request->validated(),
            (int) $request->attributes->get(
                'id_usuario_autenticado'
            )
        );

        return response()->json([
            'message' =>
                'Estado del pedido actualizado correctamente.',
            'pedido' => $pedido,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Services\Catalogo\CatalogoService;
use App\Services\Catalogo\CatalogoServiceException;
use App\Services\Clientes\ClienteService;
use App\Services\Clientes\ClienteServiceException;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pedido::query()->with('detalles')->orderByDesc('id_pedido');
        $filtros = $request->validate([
            'estado' => ['sometimes', 'in:REGISTRADO,EN_PREPARACION,LISTO,ENTREGADO,CANCELADO'],
            'fecha_entrega' => ['sometimes', 'date_format:Y-m-d'],
            'id_cliente' => ['sometimes', 'integer', 'min:1'],
        ]);
        foreach ($filtros as $campo => $valor) {
            $query->where($campo, $valor);
        }
        return response()->json(['pedidos' => $query->get()]);
    }

    public function show(Pedido $pedido): JsonResponse
    {
        return response()->json(['pedido' => $pedido->load('detalles')]);
    }

    public function store(Request $request, ClienteService $clientes, CatalogoService $catalogo): JsonResponse
    {
        $datos = $this->validar($request);
        try {
            $lineas = $this->prepararLineas($datos, $request, $clientes, $catalogo);
        } catch (ClienteServiceException|CatalogoServiceException $e) {
            return $this->errorDependencia($e);
        }

        $pedido = DB::transaction(function () use ($datos, $lineas, $request) {
            $pedido = Pedido::create([
                'id_cliente' => $datos['id_cliente'],
                'id_usuario' => $request->attributes->get('id_usuario_autenticado'),
                'fecha_pedido' => now(),
                'fecha_entrega' => $datos['fecha_entrega'],
                'hora_entrega' => $datos['hora_entrega'],
                'total' => $lineas['total'],
                'estado' => 'REGISTRADO',
                'observaciones' => $datos['observaciones'] ?? null,
            ]);
            $pedido->detalles()->createMany($lineas['detalles']);
            return $pedido;
        });

        return response()->json(['pedido' => $pedido->load('detalles')], 201);
    }

    public function update(Request $request, Pedido $pedido, ClienteService $clientes, CatalogoService $catalogo): JsonResponse
    {
        $datos = $this->validar($request);
        if ($pedido->estado !== 'REGISTRADO') {
            return response()->json(['error' => ['code' => 'PEDIDO_NO_EDITABLE', 'message' => 'Solo se puede editar un pedido registrado.']], 409);
        }
        try {
            $lineas = $this->prepararLineas($datos, $request, $clientes, $catalogo);
        } catch (ClienteServiceException|CatalogoServiceException $e) {
            return $this->errorDependencia($e);
        }

        $actualizado = DB::transaction(function () use ($pedido, $datos, $lineas) {
            $bloqueado = Pedido::query()->lockForUpdate()->findOrFail($pedido->id_pedido);
            if ($bloqueado->estado !== 'REGISTRADO') {
                return null;
            }
            $bloqueado->update([
                'id_cliente' => $datos['id_cliente'],
                'fecha_entrega' => $datos['fecha_entrega'],
                'hora_entrega' => $datos['hora_entrega'],
                'total' => $lineas['total'],
                'observaciones' => $datos['observaciones'] ?? null,
            ]);
            $bloqueado->detalles()->delete();
            $bloqueado->detalles()->createMany($lineas['detalles']);
            return $bloqueado;
        });

        if ($actualizado === null) {
            return response()->json(['error' => ['code' => 'PEDIDO_NO_EDITABLE', 'message' => 'El estado del pedido cambió.']], 409);
        }
        return response()->json(['pedido' => $actualizado->load('detalles')]);
    }

    private function validar(Request $request): array
    {
        $datos = $request->validate([
            'id_cliente' => ['required', 'integer', 'min:1'],
            'fecha_entrega' => ['required', 'date_format:Y-m-d'],
            'hora_entrega' => ['required', 'date_format:H:i'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.presentacion_id' => ['required', 'integer', 'min:1'],
            'detalles.*.cantidad' => ['required', 'integer', 'min:1', 'max:100000'],
            'detalles.*.detalle_personalizacion' => ['nullable', 'string', 'max:2000'],
        ]);

        if (Carbon::createFromFormat('Y-m-d H:i', $datos['fecha_entrega'].' '.$datos['hora_entrega']) <= now()) {
            throw ValidationException::withMessages(['fecha_entrega' => 'La entrega debe ser posterior al registro.']);
        }
        return $datos;
    }

    private function prepararLineas(array $datos, Request $request, ClienteService $clientes, CatalogoService $catalogo): array
    {
        $actor = (int) $request->attributes->get('id_usuario_autenticado');
        $clientes->validarParaPedido((int) $datos['id_cliente'], $actor);
        $detalles = [];
        $total = '0.00';
        foreach ($datos['detalles'] as $item) {
            $personalizacion = trim((string) ($item['detalle_personalizacion'] ?? ''));
            $presentacion = $catalogo->obtenerPresentacionDisponible((int) $item['presentacion_id'], $actor, $personalizacion);
            $subtotal = bcmul($presentacion['precio_unitario_snapshot'], (string) $item['cantidad'], 2);
            $total = bcadd($total, $subtotal, 2);
            if (bccomp($total, '9999999999.99', 2) > 0) {
                throw ValidationException::withMessages(['detalles' => 'El total supera el límite permitido.']);
            }
            $detalles[] = [
                'presentacion_id' => $presentacion['presentacion_id'],
                'nombre_presentacion_snapshot' => $presentacion['nombre_presentacion_snapshot'],
                'precio_unitario_snapshot' => $presentacion['precio_unitario_snapshot'],
                'cantidad' => (int) $item['cantidad'],
                'detalle_personalizacion' => $personalizacion !== '' ? $personalizacion : null,
                'costo_personalizacion' => '0.00',
                'subtotal' => $subtotal,
            ];
        }
        return ['detalles' => $detalles, 'total' => $total];
    }

    private function errorDependencia(ClienteServiceException|CatalogoServiceException $e): JsonResponse
    {
        return response()->json(['error' => ['code' => $e->codigo, 'message' => $e->getMessage(), 'details' => (object) []]], $e->httpStatus);
    }
}

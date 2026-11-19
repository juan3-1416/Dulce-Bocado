<?php

namespace App\Http\Controllers;

use App\Services\Inventario\VentaInventarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VentaInventarioController extends Controller
{
    public function aplicar(Request $request, VentaInventarioService $service): JsonResponse
    {
        $datos = $request->validate([
            'operacion_id' => ['required', 'uuid'],
            'venta_id' => ['required', 'integer', 'min:1'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.presentacion_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.cantidad' => ['required', 'integer', 'min:1', 'max:999999999'],
        ]);
        return response()->json($service->aplicar($datos, (int) $request->attributes->get('id_usuario_autenticado')));
    }

    public function consultar(string $operacionId, VentaInventarioService $service): JsonResponse
    {
        $resultado = $service->consultar($operacionId);
        return response()->json($resultado ?? ['message' => 'Operación no encontrada.'], $resultado ? 200 : 404);
    }
}

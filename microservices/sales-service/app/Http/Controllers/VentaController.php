<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnularVentaRequest;
use App\Http\Requests\GuardarVentaRequest;
use App\Models\Venta;
use App\Services\Ventas\VentaException;
use App\Services\Ventas\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VentaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'estado' => ['sometimes', 'in:BORRADOR,CANCELADA'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $ventas = Venta::query()->when(isset($filtros['estado']), fn ($q) => $q->where('estado', $filtros['estado']))
            ->orderByDesc('fecha_venta')->orderByDesc('id_venta')->paginate($filtros['per_page'] ?? 15);

        return response()->json($ventas);
    }

    public function show(string $venta): JsonResponse
    {
        return response()->json(['venta' => Venta::findOrFail($venta)->load('detalles')]);
    }

    public function store(GuardarVentaRequest $request, VentaService $service): JsonResponse
    {
        $resultado = $service->crear($request->validated(), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    public function update(GuardarVentaRequest $request, string $venta, VentaService $service): JsonResponse
    {
        $resultado = $service->modificar(Venta::findOrFail($venta), $request->validated(), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    public function cancel(AnularVentaRequest $request, string $venta, VentaService $service): JsonResponse
    {
        $resultado = $service->anular(Venta::findOrFail($venta), $request->validated('motivo'), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    private function actor(Request $request): int
    {
        return (int) $request->attributes->get('id_usuario_autenticado');
    }

    private function clave(Request $request): string
    {
        $clave = $request->header('Idempotency-Key');
        if (!is_string($clave) || preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $clave) !== 1) {
            throw new VentaException(422, 'CLAVE_IDEMPOTENTE_REQUERIDA', 'Envíe Idempotency-Key de 16 a 128 caracteres.');
        }
        return $clave;
    }
}

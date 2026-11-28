<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnularVentaRequest;
use App\Http\Requests\GuardarVentaRequest;
use App\Models\Venta;
use App\Services\Ventas\VentaException;
use App\Services\Ventas\VentaConfirmacionService;
use App\Services\Ventas\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VentaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'estado' => ['sometimes', 'in:BORRADOR,CONFIRMADA,CANCELADA'],
            'fecha_venta' => ['sometimes', 'date_format:Y-m-d'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'incluir_detalles' => ['sometimes', 'boolean'],
        ]);

        $ventas = Venta::query()
            ->when(
                $request->boolean('incluir_detalles'),
                fn ($q) => $q->with('detalles')
            )
            ->when(
                isset($filtros['estado']),
                fn ($q) => $q->where('estado', $filtros['estado'])
            )
            ->when(
                isset($filtros['fecha_venta']),
                function ($q) use ($filtros) {
                    $inicio = \Carbon\CarbonImmutable::createFromFormat(
                        '!Y-m-d',
                        $filtros['fecha_venta'],
                        'America/La_Paz'
                    );

                    $fin = $inicio->addDay();

                    $zonaAlmacenamiento = config('app.timezone', 'UTC');
                    $formato = $q->getModel()->getConnection()->getDriverName() === 'pgsql' ? 'Y-m-d H:i:sP' : 'Y-m-d H:i:s';

                    $q->where(
                        'fecha_venta',
                        '>=',
                        $inicio->setTimezone($zonaAlmacenamiento)->format($formato)
                    )->where(
                        'fecha_venta',
                        '<',
                        $fin->setTimezone($zonaAlmacenamiento)->format($formato)
                    );
                }
            )
            ->orderByDesc('fecha_venta')
            ->orderByDesc('id_venta')
            ->paginate($filtros['per_page'] ?? 15)
            ->withQueryString();

        return response()->json($ventas);
    }

    public function show(string $venta): JsonResponse
    {
        return response()->json(['venta' => $this->buscarVenta($venta)->load('detalles')]);
    }

    public function store(GuardarVentaRequest $request, VentaService $service): JsonResponse
    {
        $resultado = $service->crear($request->validated(), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    public function update(GuardarVentaRequest $request, string $venta, VentaService $service): JsonResponse
    {
        $resultado = $service->modificar($this->buscarVenta($venta), $request->validated(), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    public function confirm(
        Request $request,
        string $venta,
        VentaConfirmacionService $service
    ): JsonResponse {
        $resultado = $service->confirmar(
            $this->buscarVenta($venta),
            $this->actor($request),
            $this->clave($request)
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }
    public function cancel(AnularVentaRequest $request, string $venta, VentaService $service): JsonResponse
    {
        $resultado = $service->anular($this->buscarVenta($venta), $request->validated('motivo'), $this->actor($request), $this->clave($request));
        return response()->json($resultado['body'], $resultado['status']);
    }

    private function buscarVenta(string $id): Venta
    {
        $idValido = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($idValido === false) {
            abort(404);
        }

        return Venta::findOrFail($idValido);
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

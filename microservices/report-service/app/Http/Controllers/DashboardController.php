<?php

namespace App\Http\Controllers;

use App\Services\DashboardAggregatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardAggregatorService $aggregatorService
    ) {}

    /**
     * Devuelve el resumen general de métricas, KPIs, gráficos y accesos rápidos del dashboard.
     * Compatible con frontend GET /api/dashboard/resumen y GET /api/dashboard.
     */
    public function resumen(Request $request): JsonResponse
    {
        $periodo = $request->query('periodo', 'mes');
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $token = $request->bearerToken() ?? '';

        $datos = $this->aggregatorService->obtenerResumen(
            $periodo,
            $fechaInicio,
            $fechaFin,
            $token
        );

        return response()->json($datos);
    }

    /**
     * Alias para compatibilidad con la ruta index de Laravel.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->resumen($request);
    }
}

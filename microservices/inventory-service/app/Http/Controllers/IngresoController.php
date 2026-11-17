<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreIngresoRequest;
use App\Services\Inventario\IngresoService;
use Illuminate\Http\JsonResponse;

class IngresoController extends Controller
{
    public function store(
        StoreIngresoRequest $request,
        IngresoService $service
    ): JsonResponse {
        $actor = (int) $request->attributes->get(
            'id_usuario_autenticado'
        );

        $resultado = $service->registrar(
            $request->validated(),
            $actor
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }
}
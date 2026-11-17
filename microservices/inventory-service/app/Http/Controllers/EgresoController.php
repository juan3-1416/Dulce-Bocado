<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEgresoRequest;
use App\Services\Inventario\EgresoService;
use Illuminate\Http\JsonResponse;

class EgresoController extends Controller
{
    public function store(
        StoreEgresoRequest $request,
        EgresoService $service
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
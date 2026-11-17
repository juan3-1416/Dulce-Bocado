<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTrasladoRequest;
use App\Services\Inventario\TrasladoService;
use Illuminate\Http\JsonResponse;

class TrasladoController extends Controller
{
    public function store(
        StoreTrasladoRequest $request,
        TrasladoService $service
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
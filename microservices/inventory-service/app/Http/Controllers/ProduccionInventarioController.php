<?php

namespace App\Http\Controllers;

use App\Http\Requests\AplicarProduccionRequest;
use App\Services\Inventario\ProduccionInventarioService;
use Illuminate\Http\JsonResponse;

class ProduccionInventarioController extends Controller
{
    public function aplicar(
        AplicarProduccionRequest $request,
        ProduccionInventarioService $service
    ): JsonResponse {
        $actor = (int) $request
            ->attributes
            ->get(
                'id_usuario_autenticado'
            );

        $resultado = $service->aplicar(
            $request->validated(),
            $actor
        );

        return response()->json(
            $resultado['body'],
            $resultado['status']
        );
    }

    public function consultar(
        string $operacionId,
        ProduccionInventarioService $service
    ): JsonResponse {
        $resultado =
            $service->consultar(
                $operacionId
            );

        if ($resultado === null) {
            return response()->json([
                'message' =>
                    'Operación no encontrada.',
            ], 404);
        }

        return response()->json(
            $resultado
        );
    }
}
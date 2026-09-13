<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Inventario;
use Illuminate\Http\JsonResponse;

class AlmacenController extends Controller
{
    /**
     * Listar todos los almacenes
     */
    public function index(): JsonResponse
    {
        $almacenes = Almacen::all();
        return response()->json($almacenes, 200);
    }

    /**
     * Obtener el detalle de un almacén
     */
    public function show($id): JsonResponse
    {
        $almacen = Almacen::find($id);

        if (!$almacen) {
            return response()->json(['message' => 'Almacén no encontrado.'], 404);
        }

        return response()->json($almacen, 200);
    }

    /**
     * Listar las existencias de un almacén específico
     */
    public function existencias($id): JsonResponse
    {
        $almacen = Almacen::find($id);

        if (!$almacen) {
            return response()->json(['message' => 'Almacén no encontrado.'], 404);
        }

        $existencias = Inventario::with(['productoPresentacion.producto', 'materiaPrima'])
            ->where('id_almacen', $id)
            ->get();

        return response()->json($existencias, 200);
    }
}

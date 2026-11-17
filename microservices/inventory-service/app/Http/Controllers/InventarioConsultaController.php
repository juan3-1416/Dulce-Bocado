<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Existencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InventarioConsultaController extends Controller
{
    public function almacenes(): JsonResponse
    {
        $almacenes = Almacen::query()
            ->orderBy('id_almacen')
            ->get([
                'id_almacen',
                'nombre',
                'tipo',
                'activo',
            ]);

        return response()->json([
            'almacenes' => $almacenes,
        ]);
    }

    public function existencias(Request $request): JsonResponse
    {
        $validator = Validator::make(
            $request->query(),
            [
                'almacen_id' => [
                    'nullable',
                    'integer',
                    'min:1',
                ],
                'tipo_articulo' => [
                    'nullable',
                    'in:MATERIA_PRIMA,PRESENTACION',
                ],
                'articulo_id' => [
                    'nullable',
                    'integer',
                    'min:1',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'error' => [
                    'code' => 'FILTROS_INVALIDOS',
                    'message' => 'Los filtros de existencias no son válidos.',
                    'details' => $validator->errors(),
                ],
            ], 422);
        }

        $datos = $validator->validated();

        $query = Existencia::query()
            ->select([
                'almacen_id',
                'tipo_articulo',
                'articulo_id',
                'cantidad',
                'unidad',
            ]);

        if (isset($datos['almacen_id'])) {
            $query->where(
                'almacen_id',
                $datos['almacen_id']
            );
        }

        if (isset($datos['tipo_articulo'])) {
            $query->where(
                'tipo_articulo',
                $datos['tipo_articulo']
            );
        }

        if (isset($datos['articulo_id'])) {
            $query->where(
                'articulo_id',
                $datos['articulo_id']
            );
        }

        $existencias = $query
            ->orderBy('almacen_id')
            ->orderBy('tipo_articulo')
            ->orderBy('articulo_id')
            ->get();

        return response()->json([
            'existencias' => $existencias,
        ]);
    }
}
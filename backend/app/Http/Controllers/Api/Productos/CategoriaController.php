<?php

namespace App\Http\Controllers\Api\Productos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Productos\StoreCategoriaRequest;
use App\Http\Requests\Productos\UpdateCategoriaRequest;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Categoria::query()->orderBy('nombre', 'asc');

        if ($request->boolean('solo_activas', false)) {
            $query->where('estado', true);
        }

        return response()->json([
            'categorias' => $query->get(),
        ]);
    }

    public function store(StoreCategoriaRequest $request): JsonResponse
    {
        $categoria = Categoria::create($request->validated());

        return response()->json([
            'mensaje' => 'Categoría creada con éxito.',
            'categoria' => $categoria,
        ], 201);
    }

    public function update(UpdateCategoriaRequest $request, int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->update($request->validated());

        return response()->json([
            'mensaje' => 'Categoría actualizada con éxito.',
            'categoria' => $categoria,
        ]);
    }
}

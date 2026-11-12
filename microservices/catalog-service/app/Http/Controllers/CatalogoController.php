<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Presentacion;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogoController extends Controller
{
    public function categorias(Request $request): JsonResponse
    {
        $query = Categoria::query()->orderBy('nombre');
        if ($request->boolean('solo_activas')) {
            $query->where('estado', true);
        }
        return response()->json(['categorias' => $query->get()]);
    }

    public function guardarCategoria(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('categorias', 'nombre')],
            'estado' => ['sometimes', 'boolean'],
        ]);
        return response()->json(['categoria' => Categoria::create($datos)], 201);
    }

    public function actualizarCategoria(Request $request, Categoria $categoria): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('categorias', 'nombre')->ignore($categoria->id_categoria, 'id_categoria')],
            'estado' => ['sometimes', 'boolean'],
        ]);
        $categoria->update($datos);
        return response()->json(['categoria' => $categoria->fresh()]);
    }

    public function productos(Request $request): JsonResponse
    {
        $query = Producto::with('categoria')->withCount('presentaciones')->orderBy('nombre');
        if ($request->filled('buscar')) {
            $query->where('nombre', 'like', '%'.trim((string) $request->query('buscar')).'%');
        }
        if ($request->filled('id_categoria')) {
            $query->where('id_categoria', $request->integer('id_categoria'));
        }
        if (in_array($request->query('estado'), ['0', '1'], true)) {
            $query->where('estado', $request->query('estado') === '1');
        }
        return response()->json(['productos' => $query->get()]);
    }

    public function guardarProducto(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'id_categoria' => ['required', 'integer', Rule::exists('categorias', 'id_categoria')->where('estado', true)],
            'nombre' => ['required', 'string', 'max:150', Rule::unique('productos', 'nombre')->where('id_categoria', $request->integer('id_categoria'))],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'estado' => ['sometimes', 'boolean'],
        ]);
        return response()->json(['producto' => Producto::create($datos)->load('categoria')], 201);
    }

    public function actualizarProducto(Request $request, Producto $producto): JsonResponse
    {
        $datos = $request->validate([
            'id_categoria' => ['required', 'integer', Rule::exists('categorias', 'id_categoria')],
            'nombre' => ['required', 'string', 'max:150', Rule::unique('productos', 'nombre')->where('id_categoria', $request->integer('id_categoria'))->ignore($producto->id_producto, 'id_producto')],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'estado' => ['sometimes', 'boolean'],
        ]);
        $producto->update($datos);
        return response()->json(['producto' => $producto->fresh()->load('categoria')]);
    }

    public function presentaciones(Request $request): JsonResponse
    {
        $query = Presentacion::with('producto.categoria')->orderBy('nombre');
        if ($request->filled('id_producto')) {
            $query->where('id_producto', $request->integer('id_producto'));
        }
        if (in_array($request->query('disponible'), ['0', '1'], true)) {
            $query->where('disponible', $request->query('disponible') === '1');
        }
        $presentaciones = $query->get()->map(function (Presentacion $presentacion) {
            $datos = $presentacion->toArray();
            $datos['disponible'] = $this->estaDisponible($presentacion);
            return $datos;
        });
        return response()->json(['presentaciones' => $presentaciones]);
    }

    public function presentacion(Presentacion $presentacion): JsonResponse
    {
        $presentacion->load('producto.categoria');
        $datos = $presentacion->toArray();
        $datos['disponible'] = $this->estaDisponible($presentacion);
        return response()->json(['presentacion' => $datos]);
    }

    public function guardarPresentacion(Request $request): JsonResponse
    {
        $datos = $this->validarPresentacion($request);
        return response()->json(['presentacion' => Presentacion::create($datos)->fresh()], 201);
    }

    public function actualizarPresentacion(Request $request, Presentacion $presentacion): JsonResponse
    {
        $datos = $this->validarPresentacion($request, $presentacion);
        $presentacion->update($datos);
        return response()->json(['presentacion' => $presentacion->fresh()]);
    }

    private function validarPresentacion(Request $request, ?Presentacion $actual = null): array
    {
        return $request->validate([
            'id_producto' => ['required', 'integer', $actual
                ? Rule::exists('productos', 'id_producto')
                : Rule::exists('productos', 'id_producto')->where('estado', true)],
            'nombre' => ['required', 'string', 'max:200', Rule::unique('presentaciones', 'nombre')
                ->where('id_producto', $request->integer('id_producto'))
                ->ignore($actual?->presentacion_id, 'presentacion_id')],
            'precio' => ['required', 'numeric', 'min:0', 'decimal:2', 'max:9999999999.99'],
            'moneda' => ['sometimes', Rule::in(['BOB'])],
            'disponible' => ['sometimes', 'boolean'],
            'permite_personalizacion' => ['sometimes', 'boolean'],
        ]);
    }

    private function estaDisponible(Presentacion $presentacion): bool
    {
        return $presentacion->disponible
            && $presentacion->producto->estado
            && $presentacion->producto->categoria->estado;
    }
}

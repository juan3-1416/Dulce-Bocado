<?php

namespace App\Http\Controllers;

use App\Models\MateriaPrima;
use App\Models\Receta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RecetaController extends Controller
{
    public function materiasPrimas(Request $request): JsonResponse
    {
        $query = MateriaPrima::query()->orderBy('nombre');
        if ($request->filled('buscar')) {
            $query->where('nombre', 'like', '%'.trim((string) $request->query('buscar')).'%');
        }
        if (in_array($request->query('estado'), ['0', '1'], true)) {
            $query->where('estado', $request->query('estado') === '1');
        }
        return response()->json(['materias_primas' => $query->get()]);
    }

    public function guardarMateriaPrima(Request $request): JsonResponse
    {
        $datos = $this->validarMateriaPrima($request);
        return response()->json(['materia_prima' => MateriaPrima::create($datos)->fresh()], 201);
    }

    public function actualizarMateriaPrima(Request $request, MateriaPrima $materiaPrima): JsonResponse
    {
        $datos = $this->validarMateriaPrima($request, $materiaPrima);
        $materiaPrima->update($datos);
        return response()->json(['materia_prima' => $materiaPrima->fresh()]);
    }

    public function cambiarEstadoMateriaPrima(Request $request, MateriaPrima $materiaPrima): JsonResponse
    {
        $datos = $request->validate(['estado' => ['required', 'boolean']]);
        $materiaPrima->update($datos);
        return response()->json(['materia_prima' => $materiaPrima->fresh()]);
    }

    public function recetas(Request $request): JsonResponse
    {
        $query = Receta::with(['presentacion.producto', 'detalles.materiaPrima'])
            ->orderByDesc('id_receta');
        if ($request->filled('buscar')) {
            $buscar = trim((string) $request->query('buscar'));
            $query->whereHas('presentacion', fn ($presentacion) =>
                $presentacion->where('nombre', 'like', '%'.$buscar.'%'));
        }
        if (in_array($request->query('estado'), ['0', '1'], true)) {
            $query->where('estado', $request->query('estado') === '1');
        }
        return response()->json(['recetas' => $query->get()]);
    }

    public function receta(Receta $receta): JsonResponse
    {
        return response()->json(['receta' => $receta->load(['presentacion.producto', 'detalles.materiaPrima'])]);
    }

    public function recetaPorPresentacion(int $presentacion): JsonResponse
    {
        $receta = Receta::with(['presentacion.producto', 'detalles.materiaPrima'])
            ->where('presentacion_id', $presentacion)->first();
        if (!$receta) {
            return response()->json(['message' => 'Receta no encontrada.'], 404);
        }
        return response()->json(['receta' => $receta]);
    }

    public function guardarReceta(Request $request): JsonResponse
    {
        $datos = $this->validarReceta($request, true);
        $receta = DB::transaction(function () use ($datos) {
            $receta = Receta::create([
                'presentacion_id' => $datos['presentacion_id'],
                'observaciones' => $datos['observaciones'] ?? null,
                'estado' => $datos['estado'] ?? true,
            ]);
            $receta->detalles()->createMany($datos['ingredientes']);
            return $receta;
        });
        return response()->json(['receta' => $receta->load(['presentacion.producto', 'detalles.materiaPrima'])], 201);
    }

    public function actualizarReceta(Request $request, Receta $receta): JsonResponse
    {
        $datos = $this->validarReceta($request, false);
        DB::transaction(function () use ($receta, $datos) {
            $receta->update([
                'observaciones' => $datos['observaciones'] ?? null,
                'estado' => $datos['estado'] ?? $receta->estado,
            ]);
            $receta->detalles()->delete();
            $receta->detalles()->createMany($datos['ingredientes']);
        });
        return response()->json(['receta' => $receta->fresh()->load(['presentacion.producto', 'detalles.materiaPrima'])]);
    }

    public function cambiarEstadoReceta(Request $request, Receta $receta): JsonResponse
    {
        $datos = $request->validate(['estado' => ['required', 'boolean']]);
        $receta->update($datos);
        return response()->json(['receta' => $receta->fresh()]);
    }

    private function validarMateriaPrima(Request $request, ?MateriaPrima $actual = null): array
    {
        return $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('materias_primas', 'nombre')->ignore($actual?->id_materia_prima, 'id_materia_prima')],
            'unidad_medida' => ['required', Rule::in(['g', 'ml', 'unidad'])],
            'costo_unitario' => ['required', 'numeric', 'gt:0', 'max:99999999.9999'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'estado' => ['sometimes', 'boolean'],
        ]);
    }

    private function validarReceta(Request $request, bool $nueva): array
    {
        return $request->validate([
            'presentacion_id' => $nueva
                ? ['required', 'integer', Rule::exists('presentaciones', 'presentacion_id'), Rule::unique('recetas', 'presentacion_id')]
                : ['prohibited'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
            'estado' => ['sometimes', 'boolean'],
            'ingredientes' => ['required', 'array', 'min:1'],
            'ingredientes.*.id_materia_prima' => ['required', 'integer', 'distinct', Rule::exists('materias_primas', 'id_materia_prima')->where('estado', true)],
            'ingredientes.*.cantidad' => ['required', 'numeric', 'gt:0', 'max:999999999.999'],
        ]);
    }
}

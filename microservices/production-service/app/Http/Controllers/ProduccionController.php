<?php

namespace App\Http\Controllers;

use App\Models\Produccion;
use App\Services\Produccion\ProduccionException;
use App\Services\Produccion\ProduccionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProduccionController
{
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'estado' => ['sometimes', Rule::in(['EN_PROCESO', 'COMPLETADA', 'RECHAZADA'])],
        ]);
        $pagina = Produccion::query()
            ->when(isset($filtros['estado']), fn ($query) => $query->where('estado', $filtros['estado']))
            ->orderByDesc('id_produccion')
            ->paginate(20);

        return response()->json([
            'producciones' => $pagina->items(),
            'pagination' => [
                'page' => $pagina->currentPage(),
                'last_page' => $pagina->lastPage(),
                'total' => $pagina->total(),
            ],
        ]);
    }

    public function show(Produccion $produccion): JsonResponse
    {
        return response()->json(['produccion' => $produccion]);
    }

    public function store(Request $request, ProduccionService $service): JsonResponse
    {
        $datos = $request->validate([
            'presentacion_id' => ['required', 'integer', 'min:1'],
            'cantidad' => ['required', 'integer', 'min:1', 'max:1000000'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
        ]);
        $clave = $request->header('Idempotency-Key');
        if (!is_string($clave) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/D', $clave)) {
            throw new ProduccionException(422, 'CLAVE_IDEMPOTENTE_INVALIDA', 'Envíe una clave de idempotencia de 16 a 128 caracteres.');
        }

        $respuesta = $service->registrar(
            $datos,
            (int) $request->attributes->get('id_usuario_autenticado'),
            $clave,
        );

        return response()->json($respuesta['body'], $respuesta['status']);
    }
}

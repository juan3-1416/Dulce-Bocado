<?php

namespace App\Http\Controllers\Api\Visitas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Visitas\RegistrarVisitaRequest;
use App\Models\Visita;
use Illuminate\Http\JsonResponse;

class VisitaController extends Controller
{
    public function index(): JsonResponse
    {
        $visitas = Visita::query()->orderBy('cantidad', 'desc')->get();

        return response()->json([
            'visitas' => $visitas,
        ]);
    }

    public function registrar(RegistrarVisitaRequest $request): JsonResponse
    {
        $rutaRaw = trim($request->validated()['ruta']);
        $ruta = $rutaRaw === '' ? '/' : $rutaRaw;

        // Normalizar ruta quitando barras finales excepto si es '/'
        if (strlen($ruta) > 1 && str_ends_with($ruta, '/')) {
            $ruta = rtrim($ruta, '/');
        }

        $visita = Visita::firstOrCreate(
            ['ruta' => $ruta],
            ['cantidad' => 0]
        );

        $visita->increment('cantidad');
        $visita->refresh();

        return response()->json([
            'visita' => $visita,
            'message' => 'Visita registrada exitosamente.',
        ]);
    }
}

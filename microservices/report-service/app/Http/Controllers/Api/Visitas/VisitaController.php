<?php

namespace App\Http\Controllers\Api\Visitas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Visitas\RegistrarVisitaRequest;
use App\Models\Visita;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

        $visita = DB::transaction(function () use ($ruta) {
            DB::table('visita')->insertOrIgnore([
                'ruta' => $ruta,
                'cantidad' => 0,
                'fecha_creacion' => now(),
                'fecha_actualizacion' => now(),
            ]);

            Visita::query()
                ->where('ruta', $ruta)
                ->increment('cantidad');

            return Visita::query()
                ->where('ruta', $ruta)
                ->firstOrFail();
        });

        return response()->json([
            'visita' => $visita,
            'message' => 'Visita registrada exitosamente.',
        ]);
    }
}

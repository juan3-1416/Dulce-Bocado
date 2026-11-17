<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventarioIdempotencia extends Model
{
    protected $table = 'inventario_idempotencia';

    protected $fillable = [
        'clave',
        'huella_solicitud',
        'tipo_operacion',
        'actor_usuario_id',
        'codigo_respuesta',
        'respuesta_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'actor_usuario_id' => 'integer',
            'codigo_respuesta' => 'integer',
            'respuesta_snapshot' => 'array',
        ];
    }
}
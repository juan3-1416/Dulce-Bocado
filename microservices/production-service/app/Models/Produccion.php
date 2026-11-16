<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Produccion extends Model
{
    protected $table = 'produccion';
    protected $primaryKey = 'id_produccion';

    protected $fillable = [
        'operacion_id',
        'presentacion_id',
        'receta_id',
        'cantidad',
        'estado',
        'consumo_snapshot',
        'actor_usuario_id',
        'observaciones',
        'codigo_rechazo',
        'fecha_completada',
        'fecha_rechazada',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'consumo_snapshot' => 'array',
            'fecha_completada' => 'immutable_datetime',
            'fecha_rechazada' => 'immutable_datetime',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProduccionOperacion extends Model
{
    protected $table = 'produccion_operacion';

    protected $primaryKey = 'operacion_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'operacion_id',
        'huella_solicitud',
        'presentacion_id',
        'cantidad_producida',
        'estado',
        'codigo_rechazo',
        'actor_usuario_id',
        'respuesta_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'presentacion_id' => 'integer',
            'cantidad_producida' => 'integer',
            'actor_usuario_id' => 'integer',
            'respuesta_snapshot' => 'array',
        ];
    }
}
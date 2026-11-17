<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movimiento extends Model
{
    protected $table = 'movimiento';

    protected $primaryKey = 'id_movimiento';

    protected $fillable = [
        'tipo',
        'tipo_articulo',
        'articulo_id',
        'cantidad',
        'unidad',
        'almacen_origen_id',
        'almacen_destino_id',
        'motivo',
        'observaciones',
        'referencia_tipo',
        'referencia_id',
        'actor_usuario_id',
    ];

    protected function casts(): array
    {
        return [
            'articulo_id' => 'integer',
            'cantidad' => 'decimal:3',
            'almacen_origen_id' => 'integer',
            'almacen_destino_id' => 'integer',
            'actor_usuario_id' => 'integer',
        ];
    }
}
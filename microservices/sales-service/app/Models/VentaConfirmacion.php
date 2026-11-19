<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentaConfirmacion extends Model
{
    protected $table = 'venta_confirmacion';

    protected $primaryKey = 'id_venta_confirmacion';

    protected $fillable = [
        'id_venta',
        'operacion_id',
        'clave',
        'hash_solicitud',
        'id_usuario',
        'estado',
        'items_snapshot',
        'codigo_http',
        'codigo_resultado',
        'respuesta_snapshot',
        'confirmado_at',
        'rechazado_at',
    ];

    protected function casts(): array
    {
        return [
            'items_snapshot' => 'array',
            'respuesta_snapshot' => 'array',
            'confirmado_at' => 'immutable_datetime',
            'rechazado_at' => 'immutable_datetime',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(
            Venta::class,
            'id_venta',
            'id_venta'
        );
    }
}
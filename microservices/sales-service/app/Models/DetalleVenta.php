<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleVenta extends Model
{
    protected $table = 'detalle_venta';
    protected $primaryKey = 'id_detalle_venta';

    protected $fillable = [
        'id_venta',
        'presentacion_id',
        'nombre_presentacion_snapshot',
        'precio_unitario_snapshot',
        'cantidad',
        'costo_personalizacion',
        'detalle_personalizacion',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'precio_unitario_snapshot' => 'decimal:2',
            'costo_personalizacion' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'id_venta', 'id_venta');
    }
}

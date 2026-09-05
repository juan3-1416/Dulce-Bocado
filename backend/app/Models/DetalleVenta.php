<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleVenta extends Model
{
    protected $table = 'detalle_venta';

    protected $primaryKey = 'id_detalle_venta';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_venta',
        'id_producto_presentacion',
        'cantidad',
        'precio_unitario',
        'costo_personalizacion',
        'detalle_personalizacion',
        'subtotal',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_unitario' => 'decimal:2',
        'costo_personalizacion' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function venta(): BelongsTo
    {
        return $this->belongsTo(
            Venta::class,
            'id_venta',
            'id_venta'
        );
    }

    public function productoPresentacion(): BelongsTo
    {
        return $this->belongsTo(
            ProductoPresentacion::class,
            'id_producto_presentacion',
            'id_producto_presentacion'
        );
    }
}
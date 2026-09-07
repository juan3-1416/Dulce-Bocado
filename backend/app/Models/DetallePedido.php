<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetallePedido extends Model
{
    protected $table = 'detalle_pedido';

    protected $primaryKey = 'id_detalle_pedido';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_pedido',
        'id_producto_presentacion',
        'cantidad',
        'precio_congelado',
        'detalle_personalizacion',
        'costo_personalizacion',
        'subtotal',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_congelado' => 'decimal:2',
        'costo_personalizacion' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(
            Pedido::class,
            'id_pedido',
            'id_pedido'
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
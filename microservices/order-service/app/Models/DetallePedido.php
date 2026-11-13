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
        'presentacion_id',
        'nombre_producto_snapshot',
        'nombre_presentacion_snapshot',
        'precio_unitario_snapshot',
        'cantidad',
        'detalle_personalizacion',
        'costo_personalizacion',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'precio_unitario_snapshot' => 'decimal:2',
            'cantidad' => 'integer',
            'costo_personalizacion' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(
            Pedido::class,
            'id_pedido',
            'id_pedido'
        );
    }
}
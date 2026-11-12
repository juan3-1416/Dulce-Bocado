<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetallePedido extends Model
{
    protected $table = 'detalle_pedido';
    protected $primaryKey = 'id_detalle_pedido';
    protected $fillable = ['id_pedido', 'presentacion_id', 'nombre_presentacion_snapshot', 'precio_unitario_snapshot', 'cantidad', 'detalle_personalizacion', 'costo_personalizacion', 'subtotal'];
    protected $casts = ['precio_unitario_snapshot' => 'decimal:2', 'costo_personalizacion' => 'decimal:2', 'subtotal' => 'decimal:2'];
}

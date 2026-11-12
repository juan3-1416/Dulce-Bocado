<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $table = 'pedido';
    protected $primaryKey = 'id_pedido';
    protected $fillable = ['id_cliente', 'id_usuario', 'fecha_pedido', 'fecha_entrega', 'hora_entrega', 'total', 'moneda', 'estado', 'observaciones'];
    protected $casts = ['fecha_pedido' => 'datetime', 'fecha_entrega' => 'date:Y-m-d', 'total' => 'decimal:2'];

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class, 'id_pedido', 'id_pedido');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $table = 'pedido';
    protected $primaryKey = 'id_pedido';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_cliente',
        'nombre_cliente_snapshot',
        'nombre_cliente_ocasional',
        'id_usuario',
        'fecha_pedido',
        'fecha_entrega',
        'hora_entrega',
        'total',
        'moneda',
        'estado',
        'observaciones',
        'id_usuario_entrega',
        'fecha_entrega_efectiva',
        'id_usuario_cancelacion',
        'motivo_cancelacion',
        'fecha_cancelacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_pedido' => 'immutable_datetime',
            'fecha_entrega' => 'date:Y-m-d',
            'total' => 'decimal:2',
            'fecha_entrega_efectiva' => 'immutable_datetime',
            'fecha_cancelacion' => 'immutable_datetime',
        ];
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(
            DetallePedido::class,
            'id_pedido',
            'id_pedido'
        );
    }
}
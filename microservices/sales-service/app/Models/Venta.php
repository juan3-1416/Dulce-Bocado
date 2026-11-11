<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $table = 'venta';
    protected $primaryKey = 'id_venta';

    protected $fillable = [
        'id_cliente',
        'nombre_cliente_ocasional',
        'id_usuario',
        'fecha_venta',
        'total',
        'moneda',
        'estado',
        'observaciones',
        'id_usuario_cancelacion',
        'motivo_cancelacion',
        'fecha_cancelacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_venta' => 'immutable_datetime',
            'fecha_cancelacion' => 'immutable_datetime',
            'total' => 'decimal:2',
        ];
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleVenta::class, 'id_venta', 'id_venta');
    }
}

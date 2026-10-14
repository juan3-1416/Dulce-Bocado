<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $table = 'pedido';

    protected $primaryKey = 'id_pedido';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_cliente',
        'nombre_cliente_ocasional',
        'id_usuario',
        'fecha_pedido',
        'fecha_entrega',
        'hora_entrega',
        'total',
        'estado',
        'observaciones',
        'id_usuario_entrega',
        'fecha_entrega_efectiva',
        'id_usuario_cancelacion',
        'motivo_cancelacion',
        'fecha_cancelacion',
    ];

    protected $casts = [
        'fecha_pedido' => 'datetime',
        'fecha_entrega' => 'date',
        'total' => 'decimal:2',
        'fecha_entrega_efectiva' => 'datetime',
        'fecha_cancelacion' => 'datetime',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    protected $appends = [
        'total_pagado',
        'saldo',
        'pagado_completo',
    ];

    public function getTotalPagadoAttribute(): float
    {
        if (!$this->relationLoaded('pagos')) {
            return (float) $this->pagos()
                ->where('estado', 'REGISTRADO')
                ->sum('monto');
        }

        return (float) $this->pagos
            ->where('estado', 'REGISTRADO')
            ->sum('monto');
    }

    public function getSaldoAttribute(): float
    {
        $saldo = (float) $this->total - $this->total_pagado;
        return max(0, round($saldo, 2));
    }

    public function getPagadoCompletoAttribute(): bool
    {
        return $this->saldo <= 0;
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(
            Cliente::class,
            'id_cliente',
            'id_cliente'
        );
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario',
            'id_usuario'
        );
    }

    public function usuarioEntrega(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_entrega',
            'id_usuario'
        );
    }

    public function usuarioCancelacion(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_cancelacion',
            'id_usuario'
        );
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(
            DetallePedido::class,
            'id_pedido',
            'id_pedido'
        );
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(
            Pago::class,
            'id_pedido',
            'id_pedido'
        );
    }
}
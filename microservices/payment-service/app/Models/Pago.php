<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pago extends Model
{
    protected $table = 'pago';

    protected $primaryKey = 'id_pago';

    protected $guarded = [
        'id_pago',
    ];

    protected $casts = [
        'total_origen_snapshot' => 'decimal:2',
        'monto' => 'decimal:2',
        'confirmado_at' => 'immutable_datetime',
        'rechazado_at' => 'immutable_datetime',
    ];

    protected $appends = [
        'id_venta',
        'id_pedido',
    ];

    public function recibo(): HasOne
    {
        return $this->hasOne(Recibo::class, 'pago_id', 'id_pago');
    }

    public function intentoQr(): BelongsTo
    {
        return $this->belongsTo(IntentoQr::class, 'intento_qr_id', 'id_intento_qr');
    }

    public function getIdVentaAttribute(): ?int
    {
        return $this->origen_tipo === 'VENTA'
            ? (int) $this->origen_id
            : null;
    }

    public function getIdPedidoAttribute(): ?int
    {
        return $this->origen_tipo === 'PEDIDO'
            ? (int) $this->origen_id
            : null;
    }
}
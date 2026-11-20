<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recibo extends Model
{
    protected $table = 'recibo';

    protected $primaryKey = 'id_recibo';

    protected $guarded = [
        'id_recibo',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'emitido_at' => 'immutable_datetime',
        'anulado_at' => 'immutable_datetime',
    ];

    protected $appends = [
        'id_pago',
        'monto',
        'nombre_cliente',
        'ci_nit_cliente',
        'metodo_pago',
        'fecha_emision',
        'fecha_anulacion',
        'cantidad_impresiones',
    ];

    public function pago(): BelongsTo
    {
        return $this->belongsTo(Pago::class, 'pago_id', 'id_pago');
    }

    public function getIdPagoAttribute(): int
    {
        return (int) $this->pago_id;
    }

    public function getMontoAttribute(): string
    {
        return (string) (
            $this->snapshot['monto']
            ?? ($this->pago?->monto ?? '0.00')
        );
    }

    public function getNombreClienteAttribute(): string
    {
        return (string) (
            $this->snapshot['cliente']['nombre']
            ?? 'Cliente ocasional'
        );
    }

    public function getCiNitClienteAttribute(): ?string
    {
        return $this->snapshot['cliente']['ci_nit'] ?? null;
    }

    public function getMetodoPagoAttribute(): string
    {
        return (string) (
            $this->snapshot['medio']
            ?? ($this->pago?->medio ?? 'EFECTIVO')
        );
    }

    public function getFechaEmisionAttribute()
    {
        return $this->emitido_at;
    }

    public function getFechaAnulacionAttribute()
    {
        return $this->anulado_at;
    }

    public function getCantidadImpresionesAttribute(): int
    {
        return (int) ($this->snapshot['cantidad_impresiones'] ?? 0);
    }
}

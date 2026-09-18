<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagoInternet extends Model
{
    protected $table = 'pago_internet';

    protected $primaryKey =
        'id_pago_internet';

    public const CREATED_AT =
        'fecha_creacion';

    public const UPDATED_AT =
        'fecha_actualizacion';

    protected $fillable = [
        'id_venta',
        'id_pago',
        'id_usuario',
        'monto',
        'proveedor',
        'referencia_transaccion',
        'estado',
        'motivo_rechazo',
        'respuesta_proveedor',
        'fecha_solicitud',
        'fecha_confirmacion',

        // QR
        'token_qr',
        'fecha_vencimiento',
        'fecha_escaneo',
    ];

    protected $casts = [
        'monto' => 'decimal:2',

        'respuesta_proveedor' =>
            'array',

        'fecha_solicitud' =>
            'datetime',

        'fecha_confirmacion' =>
            'datetime',

        'fecha_vencimiento' =>
            'datetime',

        'fecha_escaneo' =>
            'datetime',

        'fecha_creacion' =>
            'datetime',

        'fecha_actualizacion' =>
            'datetime',
    ];

    public function venta(): BelongsTo
    {
        return $this->belongsTo(
            Venta::class,
            'id_venta',
            'id_venta'
        );
    }

    public function pago(): BelongsTo
    {
        return $this->belongsTo(
            Pago::class,
            'id_pago',
            'id_pago'
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

    /*
    |--------------------------------------------------------------------------
    | Helpers QR
    |--------------------------------------------------------------------------
    */

    public function estaPendiente(): bool
    {
        return $this->estado === 'PENDIENTE';
    }

    public function estaVencida(): bool
    {
        return $this->fecha_vencimiento !== null
            && now()->greaterThan(
                $this->fecha_vencimiento
            );
    }
}
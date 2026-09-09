<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pago extends Model
{
    protected $table = 'pago';

    protected $primaryKey = 'id_pago';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_venta',
        'id_pedido',
        'id_usuario',
        'monto',
        'metodo_pago',
        'referencia',
        'estado',
        'observaciones',
        'fecha_pago',
        'id_usuario_anulacion',
        'motivo_anulacion',
        'fecha_anulacion',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha_pago' => 'datetime',
        'fecha_anulacion' => 'datetime',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function venta(): BelongsTo
    {
        return $this->belongsTo(
            Venta::class,
            'id_venta',
            'id_venta'
        );
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(
            Pedido::class,
            'id_pedido',
            'id_pedido'
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

    public function usuarioAnulacion(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_anulacion',
            'id_usuario'
        );
    }

    public function pagoInternet(): HasOne
    {
        return $this->hasOne(
            PagoInternet::class,
            'id_pago',
            'id_pago'
        );
    }

    public function recibos(): HasMany
    {
        return $this->hasMany(
            Recibo::class,
            'id_pago',
            'id_pago'
        );
    }
}
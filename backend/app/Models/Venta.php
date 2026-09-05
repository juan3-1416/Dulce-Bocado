<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $table = 'venta';

    protected $primaryKey = 'id_venta';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_cliente',
        'id_usuario',
        'nombre_cliente_ocasional',
        'fecha_venta',
        'total',
        'estado',
        'id_usuario_anulacion',
        'motivo_anulacion',
        'fecha_anulacion',
        'observaciones',
    ];

    protected $casts = [
        'fecha_venta' => 'datetime',
        'total' => 'decimal:2',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
        'fecha_anulacion' => 'datetime',
    ];

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

    public function usuarioAnulacion(): BelongsTo
{
    return $this->belongsTo(
        Usuario::class,
        'id_usuario_anulacion',
        'id_usuario'
    );
}

    public function detalles(): HasMany
    {
        return $this->hasMany(
            DetalleVenta::class,
            'id_venta',
            'id_venta'
        );
    }
    public function pagos(): HasMany
{
    return $this->hasMany(
        Pago::class,
        'id_venta',
        'id_venta'
    );
}
}
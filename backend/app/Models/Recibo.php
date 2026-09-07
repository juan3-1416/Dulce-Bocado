<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recibo extends Model
{
    protected $table = 'recibo';

    protected $primaryKey = 'id_recibo';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_pago',
        'id_usuario_emision',
        'nombre_cliente',
        'ci_nit_cliente',
        'monto',
        'metodo_pago',
        'referencia_pago',
        'fecha_pago',
        'estado',
        'fecha_emision',
        'id_usuario_anulacion',
        'motivo_anulacion',
        'fecha_anulacion',
        'cantidad_impresiones',
        'id_usuario_ultima_impresion',
        'fecha_ultima_impresion',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha_pago' => 'datetime',
        'fecha_emision' => 'datetime',
        'fecha_anulacion' => 'datetime',
        'fecha_ultima_impresion' => 'datetime',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
        'cantidad_impresiones' => 'integer',
    ];

    public function pago(): BelongsTo
    {
        return $this->belongsTo(
            Pago::class,
            'id_pago',
            'id_pago'
        );
    }

    public function usuarioEmision(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_emision',
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

    public function usuarioUltimaImpresion(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_ultima_impresion',
            'id_usuario'
        );
    }
}
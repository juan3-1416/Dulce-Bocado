<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReporteEnvio extends Model
{
    public const ESTADO_GENERADO = 'GENERADO';
    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_ENVIADO = 'ENVIADO';
    public const ESTADO_FALLIDO = 'FALLIDO';

    protected $table = 'reporte_envio';
    protected $primaryKey = 'id_envio';

    protected $fillable = [
        'tipo_reporte',
        'titulo',
        'destinatarios',
        'filtros',
        'archivo_pdf',
        'ruta_guardada',
        'estado',
        'error_mensaje',
        'idempotency_key',
        'id_usuario',
    ];

    protected $casts = [
        'destinatarios' => 'array',
        'filtros' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PagoIdempotencia extends Model
{
    protected $table = 'pago_idempotencia';

    protected $primaryKey =
        'id_pago_idempotencia';

    protected $guarded = [
        'id_pago_idempotencia',
    ];

    protected $casts = [
        'respuesta_snapshot' => 'array',
    ];
}
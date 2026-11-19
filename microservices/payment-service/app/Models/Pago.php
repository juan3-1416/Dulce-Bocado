<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
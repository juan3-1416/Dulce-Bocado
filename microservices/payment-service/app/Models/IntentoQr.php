<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class IntentoQr extends Model
{
    protected $table = 'intento_qr';

    protected $primaryKey = 'id_intento_qr';

    protected $guarded = [
        'id_intento_qr',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'expira_at' => 'immutable_datetime',
        'confirmado_at' => 'immutable_datetime',
        'rechazado_at' => 'immutable_datetime',
    ];

    public function eventos(): HasMany
    {
        return $this->hasMany(
            EventoQr::class,
            'intento_qr_id',
            'id_intento_qr'
        );
    }

    public function pago(): HasOne
    {
        return $this->hasOne(
            Pago::class,
            'intento_qr_id',
            'id_intento_qr'
        );
    }
}

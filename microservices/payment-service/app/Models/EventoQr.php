<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventoQr extends Model
{
    protected $table = 'evento_qr';

    protected $primaryKey = 'id_evento_qr';

    protected $guarded = [
        'id_evento_qr',
    ];

    protected $casts = [
        'payload' => 'array',
        'recibido_at' => 'immutable_datetime',
        'procesado_at' => 'immutable_datetime',
    ];

    public function intentoQr(): BelongsTo
    {
        return $this->belongsTo(
            IntentoQr::class,
            'intento_qr_id',
            'id_intento_qr'
        );
    }
}

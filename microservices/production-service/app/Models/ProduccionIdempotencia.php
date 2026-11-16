<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProduccionIdempotencia extends Model
{
    protected $table = 'produccion_idempotencia';

    protected $fillable = [
        'clave',
        'huella_solicitud',
        'id_produccion',
        'codigo_respuesta',
        'respuesta_snapshot',
    ];

    protected function casts(): array
    {
        return ['respuesta_snapshot' => 'array'];
    }

    public function produccion(): BelongsTo
    {
        return $this->belongsTo(Produccion::class, 'id_produccion', 'id_produccion');
    }
}

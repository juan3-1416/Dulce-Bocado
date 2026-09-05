<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleReceta extends Model
{
    use HasFactory;

    protected $table = 'detalle_receta';

    protected $primaryKey = 'id_detalle_receta';

    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_receta',
        'id_materia_prima',
        'cantidad',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function receta(): BelongsTo
    {
        return $this->belongsTo(
            Receta::class,
            'id_receta',
            'id_receta'
        );
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(
            MateriaPrima::class,
            'id_materia_prima',
            'id_materia_prima'
        );
    }
}
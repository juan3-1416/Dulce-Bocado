<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Receta extends Model
{
    use HasFactory;

    protected $table = 'receta';

    protected $primaryKey = 'id_receta';

    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_producto_presentacion',
        'observaciones',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function productoPresentacion(): BelongsTo
    {
        return $this->belongsTo(
            ProductoPresentacion::class,
            'id_producto_presentacion',
            'id_producto_presentacion'
        );
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(
            DetalleReceta::class,
            'id_receta',
            'id_receta'
        );
    }
}
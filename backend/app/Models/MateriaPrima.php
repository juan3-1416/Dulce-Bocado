<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MateriaPrima extends Model
{
    use HasFactory;

    protected $table = 'materia_prima';

    protected $primaryKey = 'id_materia_prima';

    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'nombre',
        'unidad_medida',
        'descripcion',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    public function detallesReceta(): HasMany
    {
        return $this->hasMany(
            DetalleReceta::class,
            'id_materia_prima',
            'id_materia_prima'
        );
    }
}
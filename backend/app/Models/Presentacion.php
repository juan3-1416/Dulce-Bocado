<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Presentacion extends Model
{
    use HasFactory;

    protected $table = 'presentacion';
    protected $primaryKey = 'id_presentacion';

    // Posee fecha_creacion y fecha_actualizacion
    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'nombre',
        'descripcion',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
            'fecha_creacion' => 'datetime',
            'fecha_actualizacion' => 'datetime',
        ];
    }

    // Relación N:M con Producto
    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(
            Producto::class,
            'producto_presentacion',
            'id_presentacion',
            'id_producto'
        )
        ->withPivot('precio', 'fecha_actualizacion');
    }

    public function productoPresentaciones(): HasMany
    {
        return $this->hasMany(ProductoPresentacion::class, 'id_presentacion', 'id_presentacion');
    }
}

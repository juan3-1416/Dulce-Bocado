<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory;

    protected $table = 'producto';
    protected $primaryKey = 'id_producto';

    // Solo posee fecha_creacion
    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id_categoria',
        'nombre',
        'descripcion',
        'imagen',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'id_categoria' => 'integer',
            'estado' => 'boolean',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'id_categoria', 'id_categoria');
    }

    // Relación N:M con Presentación
    public function presentaciones(): BelongsToMany
    {
        return $this->belongsToMany(
            Presentacion::class,
            'producto_presentacion',
            'id_producto',
            'id_presentacion'
        )
        ->withPivot('precio', 'fecha_actualizacion');
    }

    public function productoPresentaciones(): HasMany
    {
        return $this->hasMany(ProductoPresentacion::class, 'id_producto', 'id_producto');
    }
}

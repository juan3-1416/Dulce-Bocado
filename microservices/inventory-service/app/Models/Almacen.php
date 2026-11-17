<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Almacen extends Model
{
    protected $table = 'almacen';

    protected $primaryKey = 'id_almacen';

    protected $fillable = [
        'nombre',
        'tipo',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function existencias(): HasMany
    {
        return $this->hasMany(
            Existencia::class,
            'almacen_id',
            'id_almacen'
        );
    }
}
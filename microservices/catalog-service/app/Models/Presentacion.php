<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Presentacion extends Model
{
    protected $table = 'presentaciones';
    protected $primaryKey = 'presentacion_id';
    protected $fillable = ['id_producto', 'nombre', 'precio', 'moneda', 'disponible', 'permite_personalizacion'];
    protected $casts = [
        'precio' => 'decimal:2',
        'disponible' => 'boolean',
        'permite_personalizacion' => 'boolean',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto', 'id_producto');
    }
}

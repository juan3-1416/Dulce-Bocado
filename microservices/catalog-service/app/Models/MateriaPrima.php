<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MateriaPrima extends Model
{
    protected $table = 'materias_primas';
    protected $primaryKey = 'id_materia_prima';
    protected $fillable = ['nombre', 'unidad_medida', 'costo_unitario', 'descripcion', 'estado'];
    protected $casts = ['costo_unitario' => 'decimal:4', 'estado' => 'boolean'];
}

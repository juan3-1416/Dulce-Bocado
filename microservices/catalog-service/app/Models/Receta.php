<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Receta extends Model
{
    protected $table = 'recetas';
    protected $primaryKey = 'id_receta';
    protected $fillable = ['presentacion_id', 'observaciones', 'estado'];
    protected $casts = ['estado' => 'boolean'];

    public function presentacion()
    {
        return $this->belongsTo(Presentacion::class, 'presentacion_id', 'presentacion_id');
    }

    public function detalles()
    {
        return $this->hasMany(DetalleReceta::class, 'id_receta', 'id_receta');
    }
}

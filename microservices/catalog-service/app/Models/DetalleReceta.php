<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleReceta extends Model
{
    protected $table = 'detalle_recetas';
    protected $primaryKey = 'id_detalle_receta';
    protected $fillable = ['id_materia_prima', 'cantidad'];
    protected $casts = ['cantidad' => 'decimal:3'];

    public function materiaPrima()
    {
        return $this->belongsTo(MateriaPrima::class, 'id_materia_prima', 'id_materia_prima');
    }
}

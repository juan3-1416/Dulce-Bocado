<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\DetalleProduccion;

class Produccion extends Model
{
    use HasFactory;

    protected $table = 'produccion';
    protected $primaryKey = 'id_produccion';

    protected $fillable = [
        'id_producto_presentacion',
        'id_usuario',
        'fecha_produccion',
        'estado',
        'observaciones'
    ];

    public function productoPresentacion()
    {
        return $this->belongsTo(ProductoPresentacion::class, 'id_producto_presentacion', 'id_producto_presentacion');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }

    public function detalles()
    {
        return $this->hasMany(DetalleProduccion::class, 'id_produccion', 'id_produccion');
    }
}

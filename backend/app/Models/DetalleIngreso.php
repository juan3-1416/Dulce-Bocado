<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetalleIngreso extends Model
{
    use HasFactory;

    protected $table = 'detalle_ingreso';
    protected $primaryKey = 'id_detalle_ingreso';

    protected $fillable = [
        'id_ingreso',
        'id_almacen',
        'id_producto_presentacion',
        'id_materia_prima',
        'cantidad'
    ];

    public function ingreso()
    {
        return $this->belongsTo(Ingreso::class, 'id_ingreso', 'id_ingreso');
    }

    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'id_almacen', 'id_almacen');
    }

    public function productoPresentacion()
    {
        return $this->belongsTo(ProductoPresentacion::class, 'id_producto_presentacion', 'id_producto_presentacion');
    }

    public function materiaPrima()
    {
        return $this->belongsTo(MateriaPrima::class, 'id_materia_prima', 'id_materia_prima');
    }
}

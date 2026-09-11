<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetalleEgreso extends Model
{
    use HasFactory;

    protected $table = 'detalle_egreso';
    protected $primaryKey = 'id_detalle_egreso';

    protected $fillable = [
        'id_egreso',
        'id_almacen',
        'id_producto_presentacion',
        'id_materia_prima',
        'cantidad'
    ];

    public function egreso()
    {
        return $this->belongsTo(Egreso::class, 'id_egreso', 'id_egreso');
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

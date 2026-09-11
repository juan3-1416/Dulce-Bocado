<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetalleProduccion extends Model
{
    use HasFactory;

    protected $table = 'detalle_produccion';
    protected $primaryKey = 'id_detalle_produccion';

    protected $fillable = [
        'id_produccion',
        'id_almacen',
        'cantidad_esperada',
        'cantidad_producida'
    ];

    public function produccion()
    {
        return $this->belongsTo(Produccion::class, 'id_produccion', 'id_produccion');
    }

    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'id_almacen', 'id_almacen');
    }
}

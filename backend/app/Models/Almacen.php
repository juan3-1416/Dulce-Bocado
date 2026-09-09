<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Almacen extends Model
{
    use HasFactory;

    protected $table = 'almacen';
    protected $primaryKey = 'id_almacen';

    protected $fillable = [
        'nombre',
        'descripcion'
    ];

    public function inventarios()
    {
        return $this->hasMany(Inventario::class, 'id_almacen', 'id_almacen');
    }
}

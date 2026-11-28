<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visita extends Model
{
    use HasFactory;

    protected $table = 'visita';
    protected $primaryKey = 'id_visita';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'ruta',
        'cantidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'fecha_creacion' => 'datetime',
            'fecha_actualizacion' => 'datetime',
        ];
    }
}

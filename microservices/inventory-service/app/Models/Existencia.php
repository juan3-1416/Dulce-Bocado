<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Existencia extends Model
{
    protected $table = 'existencia';

    protected $primaryKey = 'id_existencia';

    protected $fillable = [
        'almacen_id',
        'tipo_articulo',
        'articulo_id',
        'cantidad',
        'unidad',
    ];

    protected function casts(): array
    {
        return [
            'almacen_id' => 'integer',
            'articulo_id' => 'integer',
            'cantidad' => 'decimal:3',
        ];
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(
            Almacen::class,
            'almacen_id',
            'id_almacen'
        );
    }
}
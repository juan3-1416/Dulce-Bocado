<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsumoProduccion extends Model
{
    protected $table = 'consumo_produccion';

    protected $primaryKey = 'id_consumo_produccion';

    protected $fillable = [
        'id_produccion',
        'id_materia_prima',
        'id_almacen',
        'id_usuario',
        'cantidad_teorica',
        'cantidad_consumida',
        'cantidad_desperdicio',
        'costo_unitario',
        'costo_total',
        'observaciones',
        'fecha_registro',
    ];

    protected $casts = [
        'cantidad_teorica' => 'decimal:3',
        'cantidad_consumida' => 'decimal:3',
        'cantidad_desperdicio' => 'decimal:3',
        'costo_unitario' => 'decimal:4',
        'costo_total' => 'decimal:4',
        'fecha_registro' => 'datetime',
    ];

    public function produccion(): BelongsTo
    {
        return $this->belongsTo(
            Produccion::class,
            'id_produccion',
            'id_produccion'
        );
    }

    public function materiaPrima(): BelongsTo
    {
        return $this->belongsTo(
            MateriaPrima::class,
            'id_materia_prima',
            'id_materia_prima'
        );
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(
            Almacen::class,
            'id_almacen',
            'id_almacen'
        );
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario',
            'id_usuario'
        );
    }
}
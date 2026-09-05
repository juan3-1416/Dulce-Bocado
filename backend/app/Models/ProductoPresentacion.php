<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductoPresentacion extends Model
{
    protected $table = 'producto_presentacion';

    protected $primaryKey = 'id_producto_presentacion';

    public $incrementing = true;

    public $timestamps = false;

    protected $fillable = [
        'id_producto',
        'id_presentacion',
        'precio',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'fecha_actualizacion' => 'datetime',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(
            Producto::class,
            'id_producto',
            'id_producto'
        );
    }

    public function presentacion(): BelongsTo
    {
        return $this->belongsTo(
            Presentacion::class,
            'id_presentacion',
            'id_presentacion'
        );
    }
    public function receta(): HasOne
{
    return $this->hasOne(
        Receta::class,
        'id_producto_presentacion',
        'id_producto_presentacion'
    );
}
public function detallesVenta(): HasMany
{
    return $this->hasMany(
        DetalleVenta::class,
        'id_producto_presentacion',
        'id_producto_presentacion'
    );
}
}
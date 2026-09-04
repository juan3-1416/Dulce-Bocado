<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductoPresentacion extends Model
{
    use HasFactory;

    protected $table = 'producto_presentacion';
    public $incrementing = false;
    protected $primaryKey = ['id_producto', 'id_presentacion'];

    // Solo posee fecha_actualizacion
    public const CREATED_AT = null;
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'id_producto',
        'id_presentacion',
        'precio',
    ];

    protected function casts(): array
    {
        return [
            'id_producto' => 'integer',
            'id_presentacion' => 'integer',
            'precio' => 'decimal:2',
            'fecha_actualizacion' => 'datetime',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'id_producto', 'id_producto');
    }

    public function presentacion(): BelongsTo
    {
        return $this->belongsTo(Presentacion::class, 'id_presentacion', 'id_presentacion');
    }
}

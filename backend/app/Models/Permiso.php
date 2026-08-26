<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Permiso extends Model
{
    use HasFactory;

    protected $table = 'permisos';

    protected $primaryKey = 'id_permiso';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'descripcion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function rolPermisos(): HasMany
    {
        return $this->hasMany(
            RolPermiso::class,
            'permiso_id',
            'id_permiso'
        );
    }
}
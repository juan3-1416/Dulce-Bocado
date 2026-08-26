<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RolPermiso extends Model
{
    use HasFactory;

    protected $table = 'rol_permiso';

    protected $primaryKey = 'id_rol_permiso';

    public $timestamps = false;

    protected $fillable = [
        'rol_id',
        'permiso_id',
    ];

    public function rol(): BelongsTo
    {
        return $this->belongsTo(
            Rol::class,
            'rol_id',
            'id_rol'
        );
    }

    public function permiso(): BelongsTo
    {
        return $this->belongsTo(
            Permiso::class,
            'permiso_id',
            'id_permiso'
        );
    }

    public function usuarioRolPermisos(): HasMany
    {
        return $this->hasMany(
            UsuarioRolPermiso::class,
            'rol_permiso_id',
            'id_rol_permiso'
        );
    }
}
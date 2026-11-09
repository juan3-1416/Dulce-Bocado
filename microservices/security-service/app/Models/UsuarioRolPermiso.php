<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioRolPermiso extends Model
{
    use HasFactory;

    protected $table = 'usuario_rol_permiso';

    protected $primaryKey = 'id_usuario_rol_permiso';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'rol_permiso_id',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'usuario_id',
            'id_usuario'
        );
    }

    public function rolPermiso(): BelongsTo
    {
        return $this->belongsTo(
            RolPermiso::class,
            'rol_permiso_id',
            'id_rol_permiso'
        );
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Usuario extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'usuarios';

    protected $primaryKey = 'id_usuario';

    public const CREATED_AT = 'fecha_creacion';
    public const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'nombre',
        'nombre_usuario',
        'correo_electronico',
        'contrasena',
        'activo',
        'intentos_fallidos',
        'bloqueado_hasta',
    ];

    protected $hidden = [
        'contrasena',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'intentos_fallidos' => 'integer',
            'bloqueado_hasta' => 'datetime',
            'fecha_creacion' => 'datetime',
            'fecha_actualizacion' => 'datetime',
        ];
    }

    public function usuarioRolPermisos(): HasMany
    {
        return $this->hasMany(
            UsuarioRolPermiso::class,
            'usuario_id',
            'id_usuario'
        );
    }

    public function getAuthPassword(): string
    {
        return $this->contrasena;
    }
}
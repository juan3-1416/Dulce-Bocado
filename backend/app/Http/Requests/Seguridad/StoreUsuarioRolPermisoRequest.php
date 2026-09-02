<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUsuarioRolPermisoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'usuario_id' => [
                'required',
                'integer',
                Rule::exists('usuarios', 'id_usuario')
                    ->where('activo', true),
            ],

            'rol_permiso_id' => [
                'required',
                'integer',
                Rule::exists('rol_permiso', 'id_rol_permiso'),
                Rule::unique('usuario_rol_permiso', 'rol_permiso_id')
                    ->where(
                        fn ($query) =>
                            $query->where(
                                'usuario_id',
                                $this->input('usuario_id')
                            )
                    ),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'usuario_id.required' =>
                'El usuario es obligatorio.',

            'usuario_id.exists' =>
                'El usuario seleccionado no existe o está inactivo.',

            'rol_permiso_id.required' =>
                'La relación Rol-Permiso es obligatoria.',

            'rol_permiso_id.exists' =>
                'La relación Rol-Permiso seleccionada no existe.',

            'rol_permiso_id.unique' =>
                'El usuario ya tiene asignada esta relación Rol-Permiso.',
        ];
    }
}

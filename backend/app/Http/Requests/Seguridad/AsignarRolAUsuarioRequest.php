<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AsignarRolAUsuarioRequest extends FormRequest
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

            'rol_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id_rol')
                    ->where('activo', true),
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

            'rol_id.required' =>
                'El rol es obligatorio.',

            'rol_id.exists' =>
                'El rol seleccionado no existe o está inactivo.',
        ];
    }
}

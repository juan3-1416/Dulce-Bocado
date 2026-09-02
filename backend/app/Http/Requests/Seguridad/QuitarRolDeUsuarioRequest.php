<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuitarRolDeUsuarioRequest extends FormRequest
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
                Rule::exists('usuarios', 'id_usuario'),
            ],

            'rol_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id_rol'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'usuario_id.required' =>
                'El usuario es obligatorio.',

            'usuario_id.exists' =>
                'El usuario seleccionado no existe.',

            'rol_id.required' =>
                'El rol es obligatorio.',

            'rol_id.exists' =>
                'El rol seleccionado no existe.',
        ];
    }
}

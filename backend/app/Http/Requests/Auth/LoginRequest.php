<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre_usuario' => [
                'required',
                'string',
                'max:80',
            ],
            'contrasena' => [
                'required',
                'string',
                'max:255',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_usuario.required' => 'El nombre de usuario es obligatorio.',
            'nombre_usuario.string' => 'El nombre de usuario no es válido.',
            'nombre_usuario.max' => 'El nombre de usuario no puede superar los 80 caracteres.',

            'contrasena.required' => 'La contraseña es obligatoria.',
            'contrasena.string' => 'La contraseña no es válida.',
            'contrasena.max' => 'La contraseña no es válida.',
        ];
    }
}
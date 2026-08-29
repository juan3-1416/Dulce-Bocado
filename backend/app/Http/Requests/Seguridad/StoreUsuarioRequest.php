<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => [
                'required',
                'string',
                'max:120',
            ],

            'nombre_usuario' => [
                'required',
                'string',
                'max:80',
                'unique:usuarios,nombre_usuario',
            ],

            'correo_electronico' => [
                'required',
                'email',
                'max:150',
                'unique:usuarios,correo_electronico',
            ],

            'contrasena' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' =>
                'El nombre es obligatorio.',

            'nombre.max' =>
                'El nombre no puede superar los 120 caracteres.',

            'nombre_usuario.required' =>
                'El nombre de usuario es obligatorio.',

            'nombre_usuario.max' =>
                'El nombre de usuario no puede superar los 80 caracteres.',

            'nombre_usuario.unique' =>
                'El nombre de usuario ya está registrado.',

            'correo_electronico.required' =>
                'El correo electrónico es obligatorio.',

            'correo_electronico.email' =>
                'El correo electrónico no tiene un formato válido.',

            'correo_electronico.max' =>
                'El correo electrónico no puede superar los 150 caracteres.',

            'correo_electronico.unique' =>
                'El correo electrónico ya está registrado.',

            'contrasena.required' =>
                'La contraseña es obligatoria.',

            'contrasena.confirmed' =>
                'La confirmación de la contraseña no coincide.',
        ];
    }
}
<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => is_string($this->nombre)
                ? trim($this->nombre)
                : $this->nombre,

            'nombre_usuario' => is_string($this->nombre_usuario)
                ? Str::lower(trim($this->nombre_usuario))
                : $this->nombre_usuario,

            'correo_electronico' => is_string($this->correo_electronico)
                ? Str::lower(trim($this->correo_electronico))
                : $this->correo_electronico,
        ]);
    }

    public function rules(): array
    {
        $idUsuario = $this->route('id');

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
                Rule::unique('usuarios', 'nombre_usuario')
                    ->ignore($idUsuario, 'id_usuario'),
            ],

            'correo_electronico' => [
                'required',
                'email',
                'max:150',
                Rule::unique('usuarios', 'correo_electronico')
                    ->ignore($idUsuario, 'id_usuario'),
            ],

            'contrasena' => [
                'nullable',
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

            'nombre_usuario.unique' =>
                'El nombre de usuario ya está registrado.',

            'correo_electronico.required' =>
                'El correo electrónico es obligatorio.',

            'correo_electronico.email' =>
                'El correo electrónico no tiene un formato válido.',

            'correo_electronico.unique' =>
                'El correo electrónico ya está registrado.',

            'contrasena.confirmed' =>
                'La confirmación de la contraseña no coincide.',
        ];
    }
}
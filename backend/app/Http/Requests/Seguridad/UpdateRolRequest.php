<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $idRol = $this->route('id');

        return [
            'nombre' => [
                'required',
                'string',
                'max:60',
                Rule::unique('roles', 'nombre')
                    ->ignore($idRol, 'id_rol'),
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' =>
                'El nombre del rol es obligatorio.',

            'nombre.max' =>
                'El nombre del rol no puede superar los 60 caracteres.',

            'nombre.unique' =>
                'El nombre del rol ya está registrado.',

            'descripcion.max' =>
                'La descripción no puede superar los 255 caracteres.',
        ];
    }
}
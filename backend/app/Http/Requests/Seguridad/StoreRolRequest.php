<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;

class StoreRolRequest extends FormRequest
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
                'max:60',
                'unique:roles,nombre',
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
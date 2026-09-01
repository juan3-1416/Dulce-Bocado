<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;

class StorePermisoRequest extends FormRequest
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
                'max:100',
                'unique:permisos,nombre',
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
                'El nombre del permiso es obligatorio.',

            'nombre.max' =>
                'El nombre del permiso no puede superar los 100 caracteres.',

            'nombre.unique' =>
                'El nombre del permiso ya está registrado.',

            'descripcion.max' =>
                'La descripción no puede superar los 255 caracteres.',
        ];
    }
}
<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePermisoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $idPermiso = $this->route('id');

        return [
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('permisos', 'nombre')
                    ->ignore($idPermiso, 'id_permiso'),
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
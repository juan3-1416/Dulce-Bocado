<?php

namespace App\Http\Requests\Recetas;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMateriaPrimaRequest extends FormRequest
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
                Rule::unique(
                    'materia_prima',
                    'nombre'
                ),
            ],

            'unidad_medida' => [
                'required',
                'string',
                Rule::in([
                    'g',
                    'ml',
                    'unidad',
                ]),
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'estado' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' =>
                'El nombre de la materia prima es obligatorio.',

            'nombre.unique' =>
                'Ya existe una materia prima con ese nombre.',

            'unidad_medida.required' =>
                'La unidad de medida es obligatoria.',

            'unidad_medida.in' =>
                'La unidad de medida debe ser g, ml o unidad.',

            'descripcion.max' =>
                'La descripción no puede superar los 1000 caracteres.',
        ];
    }
}
<?php

namespace App\Http\Requests\Recetas;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMateriaPrimaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique(
                    'materia_prima',
                    'nombre'
                )->ignore(
                    $id,
                    'id_materia_prima'
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
                'Ya existe otra materia prima con ese nombre.',

            'unidad_medida.required' =>
                'La unidad de medida es obligatoria.',

            'unidad_medida.in' =>
                'La unidad de medida debe ser g, ml o unidad.',
        ];
    }
}
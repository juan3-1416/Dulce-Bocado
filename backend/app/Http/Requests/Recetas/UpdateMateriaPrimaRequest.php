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
            'costo_unitario' => [
    'required',
    'numeric',
    'gt:0',
    'max:99999999.9999',
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
                'costo_unitario.required' =>
    'El costo unitario es obligatorio.',

'costo_unitario.numeric' =>
    'El costo unitario debe ser un valor numérico.',

'costo_unitario.gt' =>
    'El costo unitario debe ser mayor a cero.',

'costo_unitario.max' =>
    'El costo unitario supera el valor permitido.',
        ];
    }
}
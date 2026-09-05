<?php

namespace App\Http\Requests\Recetas;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'observaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'estado' => [
                'sometimes',
                'boolean',
            ],

            'ingredientes' => [
                'required',
                'array',
                'min:1',
            ],

            'ingredientes.*.id_materia_prima' => [
                'required',
                'integer',
                'distinct',
                Rule::exists(
                    'materia_prima',
                    'id_materia_prima'
                )->where(
                    'estado',
                    true
                ),
            ],

            'ingredientes.*.cantidad' => [
                'required',
                'numeric',
                'gt:0',
                'max:999999999.999',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'ingredientes.required' =>
                'La receta debe contener al menos un ingrediente.',

            'ingredientes.min' =>
                'La receta debe contener al menos un ingrediente.',

            'ingredientes.*.id_materia_prima.required' =>
                'La materia prima es obligatoria.',

            'ingredientes.*.id_materia_prima.exists' =>
                'Una de las materias primas no existe o está inactiva.',

            'ingredientes.*.id_materia_prima.distinct' =>
                'No puedes repetir una materia prima dentro de la misma receta.',

            'ingredientes.*.cantidad.required' =>
                'La cantidad del ingrediente es obligatoria.',

            'ingredientes.*.cantidad.gt' =>
                'La cantidad debe ser mayor a cero.',
        ];
    }
}
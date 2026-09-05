<?php

namespace App\Http\Requests\Recetas;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEstadoMateriaPrimaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado' => [
                'required',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' =>
                'El estado es obligatorio.',

            'estado.boolean' =>
                'El estado debe ser verdadero o falso.',
        ];
    }
}
<?php

namespace App\Http\Requests\Produccion;

use Illuminate\Foundation\Http\FormRequest;

class CompletarProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unidades_producidas' => [
                'required',
                'integer',
                'min:1',
            ],
            'observaciones' => [
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'unidades_producidas.required' => 'Debe indicar la cantidad de unidades producidas.',
            'unidades_producidas.integer'  => 'Las unidades producidas deben ser un número entero.',
            'unidades_producidas.min'      => 'Debe producirse al menos 1 unidad.',
        ];
    }
}

<?php

namespace App\Http\Requests\Produccion;

use Illuminate\Foundation\Http\FormRequest;

class StoreProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_producto_presentacion' => [
                'required',
                'integer',
                'exists:producto_presentacion,id_producto_presentacion',
            ],
            'cantidad' => [
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
            'id_producto_presentacion.required' => 'Debe seleccionar una presentación de producto.',
            'id_producto_presentacion.exists'   => 'La presentación seleccionada no existe.',
            'cantidad.required'                 => 'La cantidad a producir es obligatoria.',
            'cantidad.integer'                  => 'La cantidad debe ser un número entero.',
            'cantidad.min'                      => 'La cantidad mínima a producir es 1.',
        ];
    }
}

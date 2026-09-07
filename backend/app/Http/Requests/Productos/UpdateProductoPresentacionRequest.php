<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductoPresentacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'precio' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'permite_personalizacion' => [
                'required',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'precio.required' =>
                'Debe indicar el precio.',

            'precio.numeric' =>
                'El precio debe ser un valor numérico.',

            'precio.min' =>
                'El precio debe ser mayor a cero.',

            'permite_personalizacion.required' =>
                'Debe indicar si la presentación permite personalización.',

            'permite_personalizacion.boolean' =>
                'El valor de personalización no es válido.',
        ];
    }
}
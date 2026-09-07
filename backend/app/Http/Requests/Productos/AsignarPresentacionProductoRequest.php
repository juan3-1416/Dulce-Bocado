<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class AsignarPresentacionProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_presentacion' => [
                'required',
                'integer',
                'exists:presentacion,id_presentacion',
            ],

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
            'id_presentacion.required' =>
                'Debe seleccionar una presentación.',

            'id_presentacion.integer' =>
                'La presentación seleccionada no es válida.',

            'id_presentacion.exists' =>
                'La presentación seleccionada no existe.',

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
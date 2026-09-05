<?php

namespace App\Http\Requests\Ventas;

use Illuminate\Foundation\Http\FormRequest;

class AnularVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'motivo_anulacion' => [
                'required',
                'string',
                'min:5',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'motivo_anulacion.required' =>
                'Debe indicar el motivo de la anulación.',

            'motivo_anulacion.min' =>
                'El motivo de anulación debe tener al menos 5 caracteres.',

            'motivo_anulacion.max' =>
                'El motivo de anulación no puede superar los 500 caracteres.',
        ];
    }
}
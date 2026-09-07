<?php

namespace App\Http\Requests\Recibos;

use Illuminate\Foundation\Http\FormRequest;

class StoreReciboRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_pago' => [
                'required',
                'integer',
                'exists:pago,id_pago',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'id_pago.required' =>
                'Debe seleccionar un pago.',

            'id_pago.integer' =>
                'El identificador del pago no es válido.',

            'id_pago.exists' =>
                'El pago seleccionado no existe.',
        ];
    }
}
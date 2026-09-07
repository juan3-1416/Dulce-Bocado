<?php

namespace App\Http\Requests\PagosInternet;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmarPagoInternetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'resultado' => [
                'required',
                'string',
                'in:APROBADO,RECHAZADO',
            ],

            'motivo_rechazo' => [
                'nullable',
                'required_if:resultado,RECHAZADO',
                'string',
                'min:5',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'resultado.required' =>
                'Debe indicar el resultado de la transacción.',

            'resultado.in' =>
                'El resultado debe ser APROBADO o RECHAZADO.',

            'motivo_rechazo.required_if' =>
                'Debe indicar el motivo cuando el pago es rechazado.',

            'motivo_rechazo.min' =>
                'El motivo de rechazo debe tener al menos 5 caracteres.',

            'motivo_rechazo.max' =>
                'El motivo de rechazo no puede superar los 500 caracteres.',
        ];
    }
}
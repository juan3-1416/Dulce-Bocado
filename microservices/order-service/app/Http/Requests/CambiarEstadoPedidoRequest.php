<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CambiarEstadoPedidoRequest extends FormRequest
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
                'string',
                Rule::in([
                    'EN_PROCESO',
                    'ENTREGADO',
                    'CANCELADO',
                ]),
            ],

            'motivo_cancelacion' => [
                'nullable',
                'string',
                'min:3',
                'max:500',
                'required_if:estado,CANCELADO',
                'prohibited_unless:estado,CANCELADO',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' =>
                'Debe indicar el nuevo estado del pedido.',

            'estado.in' =>
                'El estado solicitado no es válido.',

            'motivo_cancelacion.required_if' =>
                'Debe indicar el motivo de cancelación.',

            'motivo_cancelacion.min' =>
                'El motivo de cancelación debe tener al menos 3 caracteres.',

            'motivo_cancelacion.max' =>
                'El motivo de cancelación no puede superar los 500 caracteres.',

            'motivo_cancelacion.prohibited_unless' =>
                'El motivo de cancelación solo corresponde al estado CANCELADO.',
        ];
    }
}
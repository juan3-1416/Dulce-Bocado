<?php

namespace App\Http\Requests\Pedidos;

use Illuminate\Foundation\Http\FormRequest;

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
                'in:EN_PROCESO,ENTREGADO,CANCELADO',
            ],
            'motivo_cancelacion' => [
                'required_if:estado,CANCELADO',
                'nullable',
                'string',
                'min:5',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado especificado no es válido.',
            'motivo_cancelacion.required_if' => 'El motivo de cancelación es obligatorio cuando el pedido se cancela.',
            'motivo_cancelacion.min' => 'El motivo de cancelación debe tener al menos 5 caracteres.',
            'motivo_cancelacion.max' => 'El motivo de cancelación no puede exceder los 500 caracteres.',
        ];
    }
}

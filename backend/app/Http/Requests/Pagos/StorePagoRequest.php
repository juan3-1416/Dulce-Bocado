<?php

namespace App\Http\Requests\Pagos;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_venta' => [
                'required_without:id_pedido',
                'nullable',
                'integer',
                'exists:venta,id_venta',
            ],

            'id_pedido' => [
                'required_without:id_venta',
                'nullable',
                'integer',
                'exists:pedido,id_pedido',
            ],

            'monto' => [
                'required',
                'numeric',
                'gt:0',
                'max:9999999999.99',
            ],

            /*
             * ONLINE queda reservado para CU12.
             */
            'metodo_pago' => [
                'required',
                'string',
                'in:EFECTIVO,QR',
            ],

            'referencia' => [
                'nullable',
                'string',
                'max:150',
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'id_venta.required_without' =>
                'Debe seleccionar una venta o un pedido.',

            'id_venta.exists' =>
                'La venta seleccionada no existe.',

            'id_pedido.required_without' =>
                'Debe seleccionar una venta o un pedido.',

            'id_pedido.exists' =>
                'El pedido seleccionado no existe.',

            'monto.required' =>
                'El monto del pago es obligatorio.',

            'monto.gt' =>
                'El monto del pago debe ser mayor a cero.',

            'metodo_pago.required' =>
                'Debe seleccionar un método de pago.',

            'metodo_pago.in' =>
                'El método de pago debe ser EFECTIVO o QR.',
        ];
    }
}
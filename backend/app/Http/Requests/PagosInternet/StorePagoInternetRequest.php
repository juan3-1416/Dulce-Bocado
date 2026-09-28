<?php

namespace App\Http\Requests\PagosInternet;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoInternetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
             * La transacción debe pertenecer
             * a una venta o a un pedido,
             * pero nunca a ambos.
             */
            'id_venta' => [
                'nullable',
                'integer',
                'exists:venta,id_venta',
                'required_without:id_pedido',
                'prohibits:id_pedido',
            ],

            'id_pedido' => [
                'nullable',
                'integer',
                'exists:pedido,id_pedido',
                'required_without:id_venta',
                'prohibits:id_venta',
            ],

            'monto' => [
                'required',
                'numeric',
                'gt:0',
                'max:9999999999.99',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'id_venta.required_without' =>
                'Debe seleccionar una venta o un pedido.',

            'id_venta.integer' =>
                'La venta seleccionada no es válida.',

            'id_venta.exists' =>
                'La venta seleccionada no existe.',

            'id_venta.prohibits' =>
                'El pago no puede estar asociado simultáneamente a una venta y a un pedido.',

            'id_pedido.required_without' =>
                'Debe seleccionar una venta o un pedido.',

            'id_pedido.integer' =>
                'El pedido seleccionado no es válido.',

            'id_pedido.exists' =>
                'El pedido seleccionado no existe.',

            'id_pedido.prohibits' =>
                'El pago no puede estar asociado simultáneamente a una venta y a un pedido.',

            'monto.required' =>
                'El monto del pago es obligatorio.',

            'monto.numeric' =>
                'El monto debe ser numérico.',

            'monto.gt' =>
                'El monto debe ser mayor a cero.',

            'monto.max' =>
                'El monto supera el máximo permitido.',
        ];
    }
}
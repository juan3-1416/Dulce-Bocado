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
                'prohibits:id_pedido',
            ],

            'id_pedido' => [
                'required_without:id_venta',
                'nullable',
                'integer',
                'exists:pedido,id_pedido',
                'prohibits:id_venta',
            ],

            'monto' => [
                'required',
                'numeric',
                'gt:0',
                'max:9999999999.99',
            ],

            /*
             * ONLINE queda reservado para CU12.
             * Desde este formulario solo se registran
             * pagos manuales en EFECTIVO o QR.
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
                'El monto del pago debe ser un valor numérico.',

            'monto.gt' =>
                'El monto del pago debe ser mayor a cero.',

            'monto.max' =>
                'El monto del pago supera el valor máximo permitido.',

            'metodo_pago.required' =>
                'Debe seleccionar un método de pago.',

            'metodo_pago.in' =>
                'El método de pago debe ser EFECTIVO o QR.',

            'referencia.max' =>
                'La referencia no puede exceder los 150 caracteres.',

            'observaciones.max' =>
                'Las observaciones no pueden exceder los 2000 caracteres.',
        ];
    }
}
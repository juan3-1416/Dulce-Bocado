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
            'id_venta' => [
                'required',
                'integer',
                'exists:venta,id_venta',
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
            'id_venta.required' =>
                'Debe seleccionar una venta.',

            'id_venta.exists' =>
                'La venta seleccionada no existe.',

            'monto.required' =>
                'El monto del pago es obligatorio.',

            'monto.numeric' =>
                'El monto debe ser numérico.',

            'monto.gt' =>
                'El monto debe ser mayor a cero.',
        ];
    }
}
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoEfectivoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'origen_tipo' => strtoupper(
                (string) $this->input(
                    'origen_tipo'
                )
            ),
            'moneda' => strtoupper(
                (string) $this->input(
                    'moneda',
                    'BOB'
                )
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'origen_tipo' => [
                'required',
                'in:VENTA,PEDIDO',
            ],

            'origen_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'monto' => [
                'required',
                'numeric',
                'regex:/^\d+(?:\.\d{1,2})?$/D',
                'gt:0',
                'max:9999999999.99',
            ],

            'moneda' => [
                'required',
                'in:BOB',
            ],
        ];
    }
}

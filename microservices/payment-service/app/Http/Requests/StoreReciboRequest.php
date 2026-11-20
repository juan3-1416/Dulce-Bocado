<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReciboRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $idPago = $this->input('id_pago') ?? $this->input('pago_id');

        if ($idPago !== null) {
            $this->merge([
                'id_pago' => (int) $idPago,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'id_pago' => [
                'required',
                'integer',
                'min:1',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'id_pago.required' => 'Debe indicar el pago a partir del cual generar el recibo.',
            'id_pago.integer' => 'El identificador de pago debe ser numérico.',
            'id_pago.min' => 'El identificador de pago no es válido.',
        ];
    }
}

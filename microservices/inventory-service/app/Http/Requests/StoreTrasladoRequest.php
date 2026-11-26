<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTrasladoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'idempotency_key' => $this->header('Idempotency-Key'),
        ]);
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => [
                'required',
                'string',
                'min:16',
                'max:128',
            ],

            'tipo_articulo' => [
                'required',
                Rule::in(['PRESENTACION']),
            ],

            'articulo_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'almacen_origen_id' => [
                'required',
                'integer',
                'min:1',
                'different:almacen_destino_id',
            ],

            'almacen_destino_id' => [
                'required',
                'integer',
                'min:1',
                'different:almacen_origen_id',
            ],

            'cantidad' => [
                'required',
                'string',
                'regex:/^[1-9]\d*$/',
            ],

            'motivo' => [
                'required',
                Rule::in([
                    'Reposición a mostrador',
                ]),
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $cantidad = (string) $this->input('cantidad', '');

                if (preg_match('/^[1-9]\d*$/', $cantidad) !== 1) {
                    return;
                }

                if (bccomp($cantidad, '999999999', 0) > 0) {
                    $validator->errors()->add(
                        'cantidad',
                        'La cantidad supera el límite permitido.'
                    );
                }
            },
        ];
    }
}
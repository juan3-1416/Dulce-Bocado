<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEgresoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'idempotency_key' =>
                $this->header('Idempotency-Key'),
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
                Rule::in([
                    'MATERIA_PRIMA',
                    'PRESENTACION',
                ]),
            ],

            'articulo_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'almacen_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'cantidad' => [
                'required',
                'string',
                'regex:/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/',
            ],

            'motivo' => [
                'required',
                'string',
                'max:200',
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
                $cantidad = (string) $this->input(
                    'cantidad',
                    ''
                );

                if (
                    preg_match(
                        '/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/',
                        $cantidad
                    ) !== 1
                ) {
                    return;
                }

                if (bccomp($cantidad, '0', 3) <= 0) {
                    $validator->errors()->add(
                        'cantidad',
                        'La cantidad debe ser mayor que cero.'
                    );

                    return;
                }

                if (
                    $this->input('tipo_articulo') === 'PRESENTACION'
                    && preg_match('/^[1-9]\d*$/', $cantidad) !== 1
                ) {
                    $validator->errors()->add(
                        'cantidad',
                        'Las presentaciones se registran en unidades enteras.'
                    );
                }
            },
        ];
    }
}
<?php

namespace App\Http\Requests\Ventas;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_cliente' => [
                'nullable',
                'integer',
                'exists:cliente,id_cliente',
            ],

            'nombre_cliente_ocasional' => [
                'nullable',
                'string',
                'max:150',
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.id_producto_presentacion' => [
                'required',
                'integer',
                'distinct',
                'exists:producto_presentacion,id_producto_presentacion',
            ],

            'items.*.cantidad' => [
                'required',
                'integer',
                'min:1',
            ],

            'items.*.costo_personalizacion' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
            ],

            'items.*.detalle_personalizacion' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $idCliente =
                    $this->input('id_cliente');

                $nombreOcasional =
                    trim(
                        (string) $this->input(
                            'nombre_cliente_ocasional',
                            ''
                        )
                    );

                if (
                    !$idCliente &&
                    $nombreOcasional === ''
                ) {
                    $validator->errors()->add(
                        'cliente',
                        'Debe seleccionar un cliente registrado o ingresar un cliente ocasional.'
                    );
                }

                if (
                    $idCliente &&
                    $nombreOcasional !== ''
                ) {
                    $validator->errors()->add(
                        'cliente',
                        'No puede seleccionar un cliente registrado y un cliente ocasional al mismo tiempo.'
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' =>
                'La venta debe contener al menos un producto.',

            'items.min' =>
                'La venta debe contener al menos un producto.',

            'items.*.id_producto_presentacion.required' =>
                'Debe seleccionar un producto y presentación.',

            'items.*.id_producto_presentacion.distinct' =>
                'No puede repetir el mismo producto y presentación en la venta.',

            'items.*.cantidad.required' =>
                'La cantidad es obligatoria.',

            'items.*.cantidad.min' =>
                'La cantidad debe ser mayor a cero.',
        ];
    }
}
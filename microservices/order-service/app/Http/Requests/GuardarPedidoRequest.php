<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GuardarPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_cliente' => [
                'required',
                Rule::in(['REGISTRADO', 'OCASIONAL']),
            ],

            'id_cliente' => [
                'nullable',
                'integer',
                'min:1',
                'required_if:tipo_cliente,REGISTRADO',
            ],

            'nombre_cliente_ocasional' => [
                'nullable',
                'string',
                'max:150',
                'required_if:tipo_cliente,OCASIONAL',
            ],

            'fecha_entrega' => [
                'required',
                'date',
                'after_or_equal:today',
            ],

            'hora_entrega' => [
                'required',
                'date_format:H:i',
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'detalles' => [
                'required',
                'array',
                'min:1',
            ],

            'detalles.*.id_producto_presentacion' => [
                'required',
                'integer',
                'min:1',
            ],

            'detalles.*.cantidad' => [
                'required',
                'integer',
                'min:1',
            ],

            'detalles.*.detalle_personalizacion' => [
                'nullable',
                'string',
                'max:500',
            ],

            'detalles.*.costo_personalizacion' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
            ],
        ];
    }
}
<?php

namespace App\Http\Requests\Pedidos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
            |--------------------------------------------------------------------------
            | Cliente
            |--------------------------------------------------------------------------
            */

            'tipo_cliente' => [
                'required',
                Rule::in([
                    'REGISTRADO',
                    'OCASIONAL',
                ]),
            ],

            'id_cliente' => [
                'nullable',
                'integer',
                'exists:cliente,id_cliente',
                'required_if:tipo_cliente,REGISTRADO',
            ],

            'nombre_cliente_ocasional' => [
                'nullable',
                'string',
                'max:150',
                'required_if:tipo_cliente,OCASIONAL',
            ],

            /*
            |--------------------------------------------------------------------------
            | Entrega
            |--------------------------------------------------------------------------
            */

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

            /*
            |--------------------------------------------------------------------------
            | Detalles
            |--------------------------------------------------------------------------
            */

            'detalles' => [
                'required',
                'array',
                'min:1',
            ],

            'detalles.*.id_producto_presentacion' => [
                'required',
                'integer',
                'exists:producto_presentacion,id_producto_presentacion',
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
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_cliente.required' =>
                'Debe seleccionar el tipo de cliente.',

            'tipo_cliente.in' =>
                'El tipo de cliente no es válido.',

            'id_cliente.required_if' =>
                'Debe seleccionar un cliente registrado.',

            'id_cliente.exists' =>
                'El cliente seleccionado no existe.',

            'nombre_cliente_ocasional.required_if' =>
                'Debe indicar el nombre del cliente ocasional.',

            'fecha_entrega.required' =>
                'Debe indicar la fecha de entrega.',

            'fecha_entrega.after_or_equal' =>
                'La fecha de entrega no puede ser anterior a la fecha actual.',

            'hora_entrega.required' =>
                'Debe indicar la hora de entrega.',

            'hora_entrega.date_format' =>
                'La hora de entrega debe tener el formato HH:MM.',

            'detalles.required' =>
                'Debe agregar al menos una presentación al pedido.',

            'detalles.min' =>
                'Debe agregar al menos una presentación al pedido.',

            'detalles.*.id_producto_presentacion.required' =>
                'Debe seleccionar una presentación.',

            'detalles.*.id_producto_presentacion.exists' =>
                'Una de las presentaciones seleccionadas no existe.',

            'detalles.*.cantidad.required' =>
                'Debe indicar la cantidad.',

            'detalles.*.cantidad.min' =>
                'La cantidad debe ser mayor a cero.',

            'detalles.*.costo_personalizacion.min' =>
                'El costo de personalización no puede ser negativo.',
        ];
    }
}
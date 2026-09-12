<?php

namespace App\Http\Requests\Produccion;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarConsumoProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unidades_buenas' => [
                'required',
                'integer',
                'min:0',
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'consumos' => [
                'required',
                'array',
                'min:1',
            ],

            'consumos.*.id_materia_prima' => [
                'required',
                'integer',
                'distinct',
                'exists:materia_prima,id_materia_prima',
            ],

            'consumos.*.cantidad_consumida' => [
                'required',
                'numeric',
                'min:0',
            ],

            'consumos.*.cantidad_desperdicio' => [
                'required',
                'numeric',
                'min:0',
            ],

            'consumos.*.observaciones' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'unidades_buenas.required' =>
                'Debe indicar la cantidad de unidades producidas en buenas condiciones.',

            'unidades_buenas.integer' =>
                'Las unidades buenas deben ser un número entero.',

            'unidades_buenas.min' =>
                'Las unidades buenas no pueden ser negativas.',

            'consumos.required' =>
                'Debe registrar el consumo de materias primas.',

            'consumos.array' =>
                'El detalle de consumos no tiene un formato válido.',

            'consumos.min' =>
                'Debe registrar al menos una materia prima.',

            'consumos.*.id_materia_prima.required' =>
                'Debe seleccionar la materia prima.',

            'consumos.*.id_materia_prima.distinct' =>
                'Una materia prima no puede repetirse.',

            'consumos.*.id_materia_prima.exists' =>
                'La materia prima seleccionada no existe.',

            'consumos.*.cantidad_consumida.required' =>
                'Debe registrar la cantidad consumida.',

            'consumos.*.cantidad_consumida.min' =>
                'La cantidad consumida no puede ser negativa.',

            'consumos.*.cantidad_desperdicio.required' =>
                'Debe registrar el desperdicio.',

            'consumos.*.cantidad_desperdicio.min' =>
                'El desperdicio no puede ser negativo.',
        ];
    }
}
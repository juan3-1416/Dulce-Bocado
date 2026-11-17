<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Contracts\Validation\Validator;

class AplicarProduccionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'operacion_id' => [
                'required',
                'uuid',
            ],

            'presentacion_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'receta_id' => [
                'required',
                'integer',
                'min:1',
            ],

            'cantidad_producida' => [
                'required',
                'integer',
                'min:1',
                'max:999999999',
            ],

            'almacen_insumos_tipo' => [
                'required',
                Rule::in(['MATERIAS_PRIMAS']),
            ],

            'almacen_terminados_tipo' => [
                'required',
                Rule::in(['PRODUCCION']),
            ],

            'ingredientes' => [
                'required',
                'array',
                'min:1',
            ],

            'ingredientes.*.materia_prima_id' => [
                'required',
                'integer',
                'min:1',
                'distinct:strict',
            ],

            'ingredientes.*.cantidad' => [
                'required',
                'string',
                'regex:/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/',
            ],

            'ingredientes.*.unidad' => [
                'required',
                Rule::in([
                    'g',
                    'ml',
                    'unidad',
                ]),
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach (
                    (array) $this->input(
                        'ingredientes',
                        []
                    ) as $indice => $ingrediente
                ) {
                    $cantidad = (string) (
                        $ingrediente['cantidad']
                        ?? ''
                    );

                    if (
                        preg_match(
                            '/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/',
                            $cantidad
                        ) !== 1
                    ) {
                        continue;
                    }

                    if (
                        bccomp(
                            $cantidad,
                            '0',
                            3
                        ) <= 0
                    ) {
                        $validator->errors()->add(
                            "ingredientes.$indice.cantidad",
                            'La cantidad debe ser mayor que cero.'
                        );
                    }
                }
            },
        ];
    }

    protected function failedValidation(
        Validator $validator
    ): void {
        $operacionId = $this->input(
            'operacion_id'
        );

        throw new HttpResponseException(
            response()->json([
                'operacion_id' =>
                    is_string($operacionId)
                        ? $operacionId
                        : null,

                'estado' => 'RECHAZADA',

                'error' => [
                    'code' =>
                        'SOLICITUD_INVENTARIO_INVALIDA',

                    'message' =>
                        'La solicitud de inventario no es vÃ¡lida.',

                    'details' =>
                        $validator
                            ->errors()
                            ->toArray(),
                ],
            ], 422)
        );
    }
}
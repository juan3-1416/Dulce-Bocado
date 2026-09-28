<?php

namespace App\Http\Requests\Inventario;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreIngresoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'glosa' => [
                'required',
                'string',
                'max:255',
            ],

            'detalles' => [
                'required',
                'array',
                'min:1',
            ],

            'detalles.*.id_almacen' => [
                'required',
                'integer',
                'exists:almacen,id_almacen',
            ],

            'detalles.*.id_materia_prima' => [
                'nullable',
                'integer',
                'exists:materia_prima,id_materia_prima',
            ],

            'detalles.*.id_producto_presentacion' => [
                'nullable',
                'integer',
                'exists:producto_presentacion,id_producto_presentacion',
            ],

            'detalles.*.cantidad' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            /*
             * El usuario ingresa el precio total pagado.
             * El precio unitario se calcula en el backend.
             */
            'detalles.*.costo_total' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:9999999999.99',
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $detalles = $this->input(
                'detalles',
                []
            );

            foreach (
                $detalles as
                $index => $detalle
            ) {
                $tieneMateriaPrima =
                    !empty(
                        $detalle[
                            'id_materia_prima'
                        ]
                    );

                $tieneProducto =
                    !empty(
                        $detalle[
                            'id_producto_presentacion'
                        ]
                    );

                if (
                    !$tieneMateriaPrima &&
                    !$tieneProducto
                ) {
                    $validator
                        ->errors()
                        ->add(
                            "detalles.{$index}",
                            'Cada detalle debe tener una Materia Prima o Producto Presentación.'
                        );
                }

                if (
                    $tieneMateriaPrima &&
                    $tieneProducto
                ) {
                    $validator
                        ->errors()
                        ->add(
                            "detalles.{$index}",
                            'Un detalle no puede ser Materia Prima y Producto Presentación a la vez.'
                        );
                }

                /*
                 * Para una materia prima el precio total
                 * pagado es obligatorio.
                 */
                if (
                    $tieneMateriaPrima &&
                    empty(
                        $detalle[
                            'costo_total'
                        ]
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            "detalles.{$index}.costo_total",
                            'El precio total pagado es obligatorio para una materia prima.'
                        );
                }

                /*
                 * Para productos terminados no corresponde
                 * registrar precio de compra.
                 */
                if (
                    $tieneProducto &&
                    array_key_exists(
                        'costo_total',
                        $detalle
                    ) &&
                    $detalle[
                        'costo_total'
                    ] !== null &&
                    $detalle[
                        'costo_total'
                    ] !== ''
                ) {
                    $validator
                        ->errors()
                        ->add(
                            "detalles.{$index}.costo_total",
                            'El precio total solo puede registrarse para materias primas.'
                        );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'glosa.required' =>
                'La glosa o motivo es obligatoria.',

            'detalles.required' =>
                'Debe agregar al menos un ítem al ingreso.',

            'detalles.min' =>
                'El ingreso debe tener al menos un detalle.',

            'detalles.*.id_almacen.required' =>
                'El almacén de destino es obligatorio para cada ítem.',

            'detalles.*.id_almacen.exists' =>
                'El almacén seleccionado no es válido.',

            'detalles.*.cantidad.required' =>
                'La cantidad es obligatoria.',

            'detalles.*.cantidad.min' =>
                'La cantidad debe ser mayor a 0.',

            'detalles.*.costo_total.numeric' =>
                'El precio total debe ser un número válido.',

            'detalles.*.costo_total.gt' =>
                'El precio total debe ser mayor a 0.',

            'detalles.*.costo_total.max' =>
                'El precio total ingresado es demasiado alto.',
        ];
    }
}
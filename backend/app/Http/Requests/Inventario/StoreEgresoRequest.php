<?php

namespace App\Http\Requests\Inventario;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreEgresoRequest extends FormRequest
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
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'glosa' => ['required', 'string', 'max:255'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.id_almacen' => ['required', 'integer', 'exists:almacen,id_almacen'],
            'detalles.*.id_materia_prima' => ['nullable', 'integer', 'exists:materia_prima,id_materia_prima'],
            'detalles.*.id_producto_presentacion' => ['nullable', 'integer', 'exists:producto_presentacion,id_producto_presentacion'],
            'detalles.*.cantidad' => ['required', 'numeric', 'min:0.001'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $detalles = $this->input('detalles', []);
            foreach ($detalles as $index => $detalle) {
                $tieneMateriaPrima = !empty($detalle['id_materia_prima']);
                $tieneProducto = !empty($detalle['id_producto_presentacion']);

                if (!$tieneMateriaPrima && !$tieneProducto) {
                    $validator->errors()->add("detalles.{$index}", 'Cada detalle debe tener al menos una Materia Prima o Producto Presentación.');
                }
                if ($tieneMateriaPrima && $tieneProducto) {
                    $validator->errors()->add("detalles.{$index}", 'Un detalle no puede ser Materia Prima y Producto Presentación a la vez.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'glosa.required' => 'La glosa o motivo del egreso es obligatoria.',
            'detalles.required' => 'Debe agregar al menos un ítem al egreso.',
            'detalles.min' => 'El egreso debe tener al menos un detalle.',
            'detalles.*.id_almacen.required' => 'El almacén de origen es obligatorio para cada ítem.',
            'detalles.*.id_almacen.exists' => 'El almacén seleccionado no es válido.',
            'detalles.*.cantidad.required' => 'La cantidad es obligatoria.',
            'detalles.*.cantidad.min' => 'La cantidad debe ser mayor a 0.',
        ];
    }
}

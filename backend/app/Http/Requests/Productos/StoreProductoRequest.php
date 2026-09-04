<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_categoria' => ['required', 'integer', 'exists:categoria,id_categoria'],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'imagen' => ['nullable', 'string', 'max:255'],
            'presentaciones' => ['nullable', 'array'],
            'presentaciones.*.id_presentacion' => ['required_with:presentaciones', 'integer', 'exists:presentacion,id_presentacion'],
            'presentaciones.*.precio' => ['required_with:presentaciones', 'numeric', 'min:0.01'],
        ];
    }
}

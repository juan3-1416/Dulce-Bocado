<?php

namespace App\Http\Requests\Productos;

use Illuminate\Foundation\Http\FormRequest;

class AsignarPresentacionProductoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_presentacion' => ['required', 'integer', 'exists:presentacion,id_presentacion'],
            'precio' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}

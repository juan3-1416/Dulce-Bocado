<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuardarVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_cliente' => ['nullable', 'integer', 'min:1'],
            'nombre_cliente_ocasional' => ['nullable', 'string', 'max:150'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.presentacion_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.cantidad' => ['required', 'integer', 'min:1', 'max:10000'],
            'items.*.detalle_personalizacion' => ['prohibited'],
            'items.*.costo_personalizacion' => ['prohibited'],
            'items.*.precio_unitario' => ['prohibited'],
            'items.*.subtotal' => ['prohibited'],
            'id_usuario' => ['prohibited'],
            'total' => ['prohibited'],
            'estado' => ['prohibited'],
        ];
    }
}

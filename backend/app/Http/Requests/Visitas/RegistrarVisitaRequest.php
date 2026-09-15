<?php

namespace App\Http\Requests\Visitas;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarVisitaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ruta' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'ruta.required' => 'La ruta es obligatoria.',
            'ruta.string' => 'La ruta debe ser una cadena de texto.',
            'ruta.max' => 'La ruta no debe exceder 255 caracteres.',
        ];
    }
}

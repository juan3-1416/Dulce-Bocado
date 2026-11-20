<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnularReciboRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $motivo = $this->input('motivo_anulacion') ?? $this->input('motivo');

        if (is_string($motivo)) {
            $this->merge([
                'motivo_anulacion' => trim($motivo),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'motivo_anulacion' => [
                'required',
                'string',
                'min:5',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'motivo_anulacion.required' => 'Debe indicar el motivo de anulación del recibo.',
            'motivo_anulacion.min' => 'El motivo de anulación debe contener al menos 5 caracteres.',
            'motivo_anulacion.max' => 'El motivo de anulación no puede exceder los 500 caracteres.',
        ];
    }
}

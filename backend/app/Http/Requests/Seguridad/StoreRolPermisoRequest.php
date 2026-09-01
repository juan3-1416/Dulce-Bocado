<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRolPermisoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rol_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id_rol')
                    ->where('activo', true),
            ],

            'permiso_id' => [
                'required',
                'integer',

                Rule::exists('permisos', 'id_permiso')
                    ->where('activo', true),

                Rule::unique('rol_permiso', 'permiso_id')
                    ->where(
                        fn ($query) =>
                            $query->where(
                                'rol_id',
                                $this->input('rol_id')
                            )
                    ),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'rol_id.required' =>
                'El rol es obligatorio.',

            'rol_id.exists' =>
                'El rol seleccionado no existe o está inactivo.',

            'permiso_id.required' =>
                'El permiso es obligatorio.',

            'permiso_id.exists' =>
                'El permiso seleccionado no existe o está inactivo.',

            'permiso_id.unique' =>
                'El rol ya tiene asignado este permiso.',
        ];
    }
}
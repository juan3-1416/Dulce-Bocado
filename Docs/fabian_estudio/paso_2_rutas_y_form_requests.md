# Paso 2: Las Rutas y los Form Requests — Módulo Clientes (CU8)

Este documento detalla el funcionamiento de la capa de enrutamiento y validación del **Módulo de Clientes**, sirviendo como guía de estudio para la defensa técnica del proyecto **Dulce Bocado**.

---

## 1. Rol en la Arquitectura

Cuando una petición HTTP sale desde la aplicación React en el navegador, no interactúa directamente con la base de datos ni con el controlador. Primero atraviesa dos filtros de seguridad y calidad:
1. **La Capa de Enrutamiento (`routes/api.php`):** Registra el endpoint, exige que el usuario esté autenticado con sesión y cuente con los permisos de rol adecuados (RBAC).
2. **La Capa de Validación (Form Requests):** Actúa como una aduana. Analiza los datos recibidos y comprueba que cumplan las reglas del negocio (longitudes, formatos, obligatoriedad, unicidad). Si la información es inválida, frena la petición de inmediato con un error `422 Unprocessable Content`.

---

## 2. Definición de Rutas en `backend/routes/api.php`

En las líneas 239 a 247 de [`backend/routes/api.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/routes/api.php) se encuentra la definición del módulo:

```php
Route::middleware(['auth:sanctum'])->prefix('clientes')->group(function () {
    Route::middleware('permiso:clientes.gestionar_cliente')->group(function () {
        Route::get('/', [ClienteController::class, 'index']);
        Route::post('/', [ClienteController::class, 'store']);
        Route::get('/{id}', [ClienteController::class, 'show'])->whereNumber('id');
        Route::put('/{id}', [ClienteController::class, 'update'])->whereNumber('id');
        Route::patch('/{id}/estado', [ClienteController::class, 'updateEstado'])->whereNumber('id');
    });
});
```

### 2.1. Desglose de Parámetros y Middlewares

* **`Route::prefix('clientes')`:**  
  Agrupa todas las rutas bajo la URL `/api/clientes`.
* **Middleware `auth:sanctum`:**  
  Protege el acceso exigiendo una cookie de sesión autenticada. Si no existe sesión activa, Laravel responde automáticamente con `401 Unauthorized`.
* **Middleware `permiso:clientes.gestionar_cliente`:**  
  Middleware de Control de Acceso Basado en Roles (RBAC). Consulta las tablas `rol_permiso` y `usuario_rol_permiso`. Si el rol del usuario conectado no tiene asignado este permiso, rechaza la solicitud con `403 Forbidden`.
* **Restricción `->whereNumber('id')`:**  
  Aplica una expresión regular interna (`^[0-9]+$`). Garantiza que el parámetro `{id}` sea obligatoriamente numérico. Si alguien intenta ingresar `/api/clientes/texto`, la ruta no coincide y retorna `404 Not Found`, impidiendo errores de tipo en PostgreSQL.

---

### 2.2. Mapeo de Verbos HTTP (Estándar RESTful)

| Verbo HTTP | Endpoint | Método en Controlador | Propósito |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/clientes` | `index()` | Listar clientes (soporta filtros de búsqueda y estado). |
| **POST** | `/api/clientes` | `store()` | Registrar un nuevo cliente. |
| **GET** | `/api/clientes/{id}` | `show()` | Obtener el detalle de un cliente específico. |
| **PUT** | `/api/clientes/{id}` | `update()` | Actualizar la totalidad de los datos del cliente. |
| **PATCH** | `/api/clientes/{id}/estado` | `updateEstado()` | Modificar únicamente el estado (`true`/`false`). |

> [!NOTE]
> **Diferencia entre `PUT` y `PATCH`:**
> * **`PUT`:** Reemplaza o actualiza el recurso de manera completa (nombre, apellido, CI, teléfono, dirección, etc.).
> * **`PATCH`:** Realiza una modificación parcial sobre un atributo específico del recurso (en este caso, exclusivamente el campo `estado`).

---

## 3. Capa de Validación: Form Requests

En lugar de validar manualmente dentro del controlador con `$request->validate(...)`, el sistema utiliza clases **Form Request**. Esto cumple con el **Principio de Responsabilidad Única (SRP)**: el controlador se enfoca en coordinar la lógica, mientras que la validación se gestiona de forma aislada.

Ubicación: `backend/app/Http/Requests/Clientes/`

---

### 3.1. `StoreClienteRequest.php` (Creación)

Archivo: [`backend/app/Http/Requests/Clientes/StoreClienteRequest.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Http/Requests/Clientes/StoreClienteRequest.php)

```php
public function rules(): array
{
    return [
        'nombre'             => ['required', 'string', 'max:100'],
        'apellido'           => ['nullable', 'string', 'max:100'],
        'ci_nit'             => ['nullable', 'string', 'max:25', 'unique:cliente,ci_nit'],
        'telefono'           => ['nullable', 'string', 'max:25'],
        'correo_electronico' => ['nullable', 'email', 'max:150'],
        'direccion'          => ['nullable', 'string', 'max:255'],
        'observaciones'      => ['nullable', 'string', 'max:1000'],
        'estado'             => ['nullable', 'boolean'],
    ];
}
```

* **`required`:** El campo `nombre` es el único dato indispensable para registrar un cliente.
* **`nullable`:** Permite que los campos vengan vacíos o nulos si el cliente no proporciona dichos datos.
* **`unique:cliente,ci_nit`:** Realiza una consulta SQL a PostgreSQL para verificar que no exista ya un registro con ese mismo número de documento:
  ```sql
  SELECT count(*) FROM cliente WHERE ci_nit = 'valor_enviado';
  ```

---

### 3.2. `UpdateClienteRequest.php` (Edición y la regla `ignore`)

Archivo: [`backend/app/Http/Requests/Clientes/UpdateClienteRequest.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Http/Requests/Clientes/UpdateClienteRequest.php)

```php
public function rules(): array
{
    $id = $this->route('id') ?? $this->route('cliente');

    return [
        'nombre'   => ['required', 'string', 'max:100'],
        'apellido' => ['nullable', 'string', 'max:100'],
        'ci_nit'   => [
            'nullable',
            'string',
            'max:25',
            Rule::unique('cliente', 'ci_nit')->ignore($id, 'id_cliente'),
        ],
        'telefono' => ['nullable', 'string', 'max:25'],
        // ...
    ];
}
```

#### ¿Por qué es fundamental `Rule::unique(...)->ignore(...)`?
Si editamos los datos de un cliente (por ejemplo, modificamos solo su teléfono pero dejamos su mismo CI/NIT), al enviar el formulario la validación `unique` simple fallaría indicando que el CI ya existe en la base de datos (pues pertenece al mismo cliente).  
El método `ignore($id, 'id_cliente')` le instruye a Laravel:
> *"Comprueba que ningún otro cliente tenga este CI/NIT, pero ignora la fila del cliente con ID `$id` que estamos editando actualmente."*

---

### 3.3. `UpdateEstadoClienteRequest.php` (Cambio de Estado)

Archivo: [`backend/app/Http/Requests/Clientes/UpdateEstadoClienteRequest.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Http/Requests/Clientes/UpdateEstadoClienteRequest.php)

```php
public function rules(): array
{
    return [
        'estado' => ['required', 'boolean'],
    ];
}
```
* Diseñado específicamente para el endpoint `PATCH /api/clientes/{id}/estado`.
* No permite campos adicionales y exige que el estado sea estrictamente booleano (`true` o `false`).

---

## 4. Ciclo de Vida ante un Error de Validación (HTTP 422)

Si los datos recibidos no cumplen con las reglas definidas:
1. Laravel intercepta la petición **antes** de que se ejecute el método del controlador.
2. Detiene la ejecución inmediatamente y responde con código HTTP **`422 Unprocessable Content`**.
3. Envía una estructura JSON con el detalle de los errores:
   ```json
   {
       "message": "Los datos proporcionados no son válidos.",
       "errors": {
           "ci_nit": ["El ci nit ya ha sido registrado."],
           "correo_electronico": ["El formato del correo electrónico es inválido."]
       }
   }
   ```
4. El frontend (React) recibe este JSON y asigna los errores a los campos correspondientes del formulario modal.

---

## 5. Preguntas Clave para la Defensa

1. **¿Por qué separar la validación en Form Requests en vez de colocarla dentro del controlador?**  
   *Respuesta:* Por el principio de Responsabilidad Única (SRP) y limpieza de código. El controlador solo debe coordinar las acciones del sistema, mientras que el Form Request encapsula toda la lógica de validación, sanitización y autorización previa.
2. **¿Qué diferencia técnica existe entre `PUT` y `PATCH` en este módulo?**  
   *Respuesta:* `PUT` actualiza el cliente por completo con todos sus campos, mientras que `PATCH` se utiliza en `/estado` para modificar únicamente la propiedad booleana del estado sin alterar el resto de la información.
3. **¿Cómo se previene el falso error de duplicado al editar un registro con campo único?**  
   *Respuesta:* Utilizando `Rule::unique('cliente', 'ci_nit')->ignore($id, 'id_cliente')`, lo que excluye el identificador del registro actual durante la comprobación de unicidad en la base de datos.

--- 

## 6. Flujo de Ejecución de Una Solicitud HTTP (Ejemplo de crear un Cliente)

[Paso A: Pantalla Visual]
 El usuario llena el formulario en React:
 frontend/src/pages/clientes/ClienteModal.jsx
 Al hacer clic en "Guardar Cliente", se dispara manejarEnvio(e).
         │
         ▼
[Paso B: Capa de Servicio Frontend]
 Se llama a la función en frontend/src/services/clienteService.js:
 crearCliente(datos) o actualizarCliente(id, datos).
         │
         ▼
[Paso C: El Navegador por la Red (HTTP)]
 La función fetch() empaqueta los datos en JSON y los dispara por la red:
 POST http://localhost:8000/api/clientes
 Headers:
   - Accept: application/json
   - Content-Type: application/json
   - X-XSRF-TOKEN: [Token de seguridad]
   - Cookie: [Cookie de sesión de Sanctum]
         │
         ▼
[Paso D: Recepción en Laravel (Backend)]
 La petición entra por backend/public/index.php.
 Laravel consulta backend/routes/api.php y ve:
 Route::post('/', [ClienteController::class, 'store'])
         │
         ▼
[Paso E: Activación Automática del Form Request]
 Como el método store() tiene el tipado (StoreClienteRequest $request),
 el inyector de dependencias de Laravel INTERCEPTA la petición ANTES de entrar al método
 y ejecuta automáticamente sus rules().
   - ¿Cumple las reglas? ➔ Entra a ClienteController::store().
   - ¿No cumple las reglas? ➔ Laravel cancela todo y responde 422 de regreso a React.

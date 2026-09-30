# Paso 3: El Controlador — Módulo Clientes (CU8)

Este documento detalla el funcionamiento interno del controlador del **Módulo de Clientes**, sirviendo como guía de estudio para la defensa técnica del proyecto **Dulce Bocado**.

---

## 1. Rol en la Arquitectura

El **Controlador** actúa como el **coordinador o director de orquesta** en la arquitectura MVC desacoplada del sistema:
* **No valida datos de entrada:** esa responsabilidad pertenece al Form Request.
* **No dibuja la interfaz visual:** esa responsabilidad pertenece a React.
* **No escribe sentencias SQL a mano:** esa responsabilidad pertenece al Modelo Eloquent.

Su trabajo se sintetiza en **3 pasos fundamentales**:
1. Recibir los datos limpios y autorizados a través de `$request->validated()`.
2. Ordenarle al Modelo ([`Cliente.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Models/Cliente.php)) qué operación realizar en la base de datos PostgreSQL.
3. Empaquetar el resultado en formato **JSON** y retornarlo al Frontend con el código de estado HTTP adecuado (`200 OK`, `201 Created`, etc.).

* **Ubicación general:** `backend/app/Http/Controllers/Api/`
* **Archivo del módulo:** [`backend/app/Http/Controllers/Api/Clientes/ClienteController.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Http/Controllers/Api/Clientes/ClienteController.php)

---

## 2. Desglose Método por Método de `ClienteController.php`

### 2.1. `index(Request $request): JsonResponse` (Listado y Búsqueda)

```php
public function index(Request $request): JsonResponse
{
    $query = Cliente::query()->orderBy('id_cliente', 'desc');

    if ($request->filled('buscar')) {
        $buscar = trim($request->query('buscar'));
        $query->where(function ($q) use ($buscar) {
            $q->where('nombre', 'ilike', "%{$buscar}%")
              ->orWhere('apellido', 'ilike', "%{$buscar}%")
              ->orWhere('ci_nit', 'ilike', "%{$buscar}%")
              ->orWhere('telefono', 'ilike', "%{$buscar}%")
              ->orWhere('direccion', 'ilike', "%{$buscar}%")
              ->orWhere('correo_electronico', 'ilike', "%{$buscar}%");
        });
    }

    if ($request->has('estado') && $request->query('estado') !== '') {
        $query->where('estado', $request->boolean('estado'));
    }

    return response()->json([
        'clientes' => $query->get(),
    ]);
}
```

* **Ordenamiento:** `orderBy('id_cliente', 'desc')` asegura que los clientes recién creados aparezcan siempre al principio de la tabla.
* **Operador `ilike` de PostgreSQL:**  
  En PostgreSQL, el operador `LIKE` distingue estrictamente entre mayúsculas y minúsculas. Usamos `ILIKE` (Case-Insensitive) para que la búsqueda sea universal: si el usuario escribe `"ana"`, encontrará tanto `"Ana"`, `"ANA"` como `"Mariana"`.
* **Filtro por estado booleano:** `$request->boolean('estado')` interpreta valores `1`/`0` o `true`/`false`.
* **Respuesta:** Retorna código HTTP `200 OK` por defecto con el array `clientes`.

---

### 2.2. `show(int $id): JsonResponse` (Consulta Individual)

```php
public function show(int $id): JsonResponse
{
    $cliente = Cliente::findOrFail($id);

    return response()->json([
        'cliente' => $cliente,
    ]);
}
```

* **`findOrFail($id)`:**  
  Busca en la tabla `cliente` por su clave primaria.  
  - Si el registro existe: devuelve la instancia del modelo.
  - Si el registro **no existe**: Laravel dispara automáticamente una excepción `ModelNotFoundException` que se convierte de forma limpia en una respuesta **`404 Not Found`**, evitando caídas del servidor.

---

### 2.3. `store(StoreClienteRequest $request): JsonResponse` (Registro)

```php
public function store(StoreClienteRequest $request): JsonResponse
{
    $cliente = Cliente::create($request->validated());

    return response()->json([
        'cliente' => $cliente,
        'message' => 'Cliente registrado exitosamente.',
    ], 201);
}
```

* **Inyección de Dependencia:** `StoreClienteRequest` ejecuta automáticamente la validación antes de que el código entre a este método.
* **`$request->validated()`:** Garantiza que únicamente pasen las columnas que superaron las reglas de validación.
* **`Cliente::create(...)`:** Inserta la fila en PostgreSQL utilizando la protección `$fillable`.
* **Código HTTP `201 Created`:** Estándar RESTful que indica la creación exitosa de un nuevo recurso.

---

### 2.4. `update(UpdateClienteRequest $request, int $id): JsonResponse` (Edición Completa)

```php
public function update(UpdateClienteRequest $request, int $id): JsonResponse
{
    $cliente = Cliente::findOrFail($id);
    $cliente->update($request->validated());

    return response()->json([
        'cliente' => $cliente,
        'message' => 'Cliente actualizado exitosamente.',
    ]);
}
```

* Responde al verbo HTTP **`PUT`**.
* Actualiza todos los campos editables del registro y responde `200 OK` junto con el objeto actualizado y un mensaje de éxito para la notificación en React.

---

### 2.5. `updateEstado(UpdateEstadoClienteRequest $request, int $id): JsonResponse` (Cambio de Estado)

```php
public function updateEstado(UpdateEstadoClienteRequest $request, int $id): JsonResponse
{
    $cliente = Cliente::findOrFail($id);
    $cliente->estado = $request->boolean('estado');
    $cliente->save();

    return response()->json([
        'cliente' => $cliente,
        'message' => 'Estado del cliente actualizado exitosamente.',
    ]);
}
```

* Responde al verbo HTTP **`PATCH`**.
* **Soft-Deactivation (Borrado Lógico):** En lugar de eliminar físicamente el registro de la tabla con `DELETE` (lo cual destruiría la integridad referencial de ventas y pedidos pasados), se desactiva cambiando `estado` a `false`.

---

## 3. Preguntas Típicas de Examen sobre este Paso

1. **¿Por qué el controlador no valida directamente los datos?**  
   *Respuesta:* Por el principio de Responsabilidad Única (SRP). La validación le corresponde a los Form Requests (`StoreClienteRequest`), dejando el controlador limpio y enfocado exclusivamente en orquestar el flujo entre la base de datos y la respuesta HTTP.
2. **¿Por qué usar `ILIKE` en lugar de `LIKE` en las búsquedas?**  
   *Respuesta:* Porque nuestra base de datos es PostgreSQL 16. En PostgreSQL, `LIKE` es sensible a mayúsculas y minúsculas. `ILIKE` permite búsquedas insensibles sin necesidad de transformar campos con `LOWER()`.
3. **¿Cuál es la diferencia entre retornar un código HTTP 200 y un 201?**  
   *Respuesta:* El código 200 indica una operación exitosa general (lectura, modificación), mientras que el 201 (`Created`) especifica que se ha creado físicamente un nuevo recurso en el servidor.

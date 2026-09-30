# Paso 1: Base de Datos y Modelo Eloquent — Módulo Clientes (CU8)

Este documento detalla el funcionamiento interno de la capa de datos y el modelo del **Módulo de Clientes**, sirviendo como guía de estudio para la defensa técnica del proyecto **Dulce Bocado**.

---

## 1. Rol en la Arquitectura

En la arquitectura del sistema, el **Modelo Eloquent** es el puente directo entre la base de datos relacional (PostgreSQL 16) y la lógica de negocio en PHP (Laravel).
Representa a una fila de la tabla `cliente` como un objeto de programación orientada a objetos (POO), proporcionando métodos para consultar, insertar, actualizar y relacionar registros.

* **Archivo del modelo:** [`backend/app/Models/Cliente.php`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/backend/app/Models/Cliente.php)
* **Tabla física en BD:** `cliente`

---

## 2. Estructura Física en PostgreSQL (Tabla `cliente`)

La tabla física almacena la información de los clientes (tanto personas individuales como empresas/razones sociales):

| Columna | Tipo de Dato | Restricción / Propósito |
| :--- | :--- | :--- |
| `id_cliente` | `BIGSERIAL` / `INT` | Clave primaria autoincremental. |
| `nombre` | `VARCHAR(100)` | **Obligatorio**. Nombre o Razón Social. |
| `apellido` | `VARCHAR(100)` | **Opcional** (`nullable`). Apellido de la persona de contacto. |
| `ci_nit` | `VARCHAR(25)` | **Opcional**, pero **único** (`unique`). Identificación fiscal/cédula. |
| `telefono` | `VARCHAR(25)` | **Opcional**. Teléfono o celular de contacto. |
| `correo_electronico` | `VARCHAR(150)` | **Opcional**. Correo para notificaciones o pedidos. |
| `direccion` | `VARCHAR(255)` | **Opcional**. Dirección para envíos/entregas. |
| `observaciones` | `TEXT` | **Opcional**. Notas adicionales sobre el cliente. |
| `estado` | `BOOLEAN` | `true` = activo, `false` = inactivo (borrado lógico/bloqueado). |
| `fecha_creacion` | `TIMESTAMP` | Fecha y hora de registro. |
| `fecha_actualizacion` | `TIMESTAMP` | Fecha y hora de última modificación. |

---

## 3. Desglose Línea por Línea de `Cliente.php`

### 3.1. Configuración de Tabla, Clave Primaria y Timestamps

```php
protected $table = 'cliente';
protected $primaryKey = 'id_cliente';

public const CREATED_AT = 'fecha_creacion';
public const UPDATED_AT = 'fecha_actualizacion';
```

* **`protected $table = 'cliente';`**  
  Por convención estándar, Laravel asume nombres de tablas en inglés plural (`clientes` o `clients`). Como nuestra base de datos está diseñada en español singular/específico, debemos indicarle explícitamente el nombre de la tabla.
* **`protected $primaryKey = 'id_cliente';`**  
  Laravel asume que la clave primaria siempre se llama `id`. Aquí redefinimos que la columna identificadora es `id_cliente`.
* **Constantes `CREATED_AT` y `UPDATED_AT`**  
  Laravel busca por defecto columnas `created_at` y `updated_at`. Le indicamos que las columnas de auditoría de tiempo se llaman `fecha_creacion` y `fecha_actualizacion`.

---

### 3.2. Asignación Masiva (`$fillable`)

```php
protected $fillable = [
    'nombre',
    'apellido',
    'ci_nit',
    'telefono',
    'correo_electronico',
    'direccion',
    'observaciones',
    'estado',
];
```

* **¿Qué es?** Es una lista blanca (whitelist) de columnas que se pueden asignar masivamente mediante `Cliente::create($datos)` o `$cliente->update($datos)`.
* **¿Por qué existe? (Seguridad):** Evita la vulnerabilidad de *Mass Assignment*. Si un atacante enviara un campo malicioso en la petición HTTP (por ejemplo un campo de administración no autorizado), Eloquent lo descarta automáticamente porque no está en `$fillable`.
* **Regla de oro para la defensa:** Si el docente te pide agregar una nueva columna a la base de datos (ej. `telefono_secundario`), **es obligatorio** añadirla aquí dentro de `$fillable`. De lo contrario, Eloquent ignorará el campo silenciosamente al guardar.

---

### 3.3. Transformación de Tipos de Datos (`casts()`)

```php
protected function casts(): array
{
    return [
        'estado' => 'boolean',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];
}
```

* Convierte los datos que vienen crudos de PostgreSQL a tipos nativos de PHP/JSON.
* La columna `estado` en la base de datos se convierte estrictamente en un booleano (`true` o `false`). Esto evita que a React le llegue un entero (`1` o `0`) o un string (`"t"` o `"f"`), garantizando que en el frontend las comparaciones `cliente.estado === true` funcionen siempre sin inconsistencias.

---

### 3.4. Accesor Virtual (`nombreCompleto`)

```php
/**
 * Accesor para nombre completo o razón social.
 */
protected function nombreCompleto(): Attribute
{
    return Attribute::make(
        get: fn () => trim("{$this->nombre} {$this->apellido}")
    );
}
```

* **Concepto:** Un accesor genera un atributo virtual calculado en memoria que no existe físicamente en la base de datos.
* **Sintaxis moderna:** Usa la clase `Attribute::make()` y el parámetro nombrado `get: fn () => ...` de PHP 8+.
* **Uso del `trim()`:** Dado que `apellido` es opcional (`nullable`), si un cliente es una empresa (ej. `nombre = "Panificadora Sur"` y `apellido = null`), al concatenar resultaría `"Panificadora Sur "`. La función `trim()` elimina cualquier espacio en blanco al inicio o al final.
* **Convención de acceso:** Aunque el método se escribe en *camelCase* (`nombreCompleto`), en PHP se consume en *snake_case*:
  ```php
  $nombre = $cliente->nombre_completo;
  ```
* **Principio DRY:** Evita tener que concatenar `$cliente->nombre . ' ' . $cliente->apellido` en múltiples controladores, recibos o reportes.

---

### 3.5. Relaciones de Negocio (1 a N con Ventas y Pedidos)

```php
public function ventas(): HasMany
{
    return $this->hasMany(
        Venta::class,
        'id_cliente',
        'id_cliente'
    );
}

public function pedidos(): HasMany
{
    return $this->hasMany(
        Pedido::class,
        'id_cliente',
        'id_cliente'
    );
}
```

* **Relación:** Define una cardinalidad **Uno a Muchos (1 a N)**. Un cliente puede tener múltiples ventas asociadas y múltiples pedidos realizados.
* **Parámetros del método `hasMany`:**
  1. `Venta::class`: El modelo destino con el que se vincula.
  2. Primer `'id_cliente'` (Foreign Key): La columna foránea que se encuentra en la tabla `venta`.
  3. Segundo `'id_cliente'` (Local Key): La columna clave primaria que pertenece a la tabla `cliente`.
* **¿Por qué se especifican ambos?**  
  Por defecto, Laravel asume que la clave foránea se llama `cliente_id` y la local `id`. Al tener ambas nombradas `id_cliente`, es obligatorio indicarlas para que Laravel no construya consultas con nombres de columnas inexistentes.
* **Consulta SQL que se ejecuta en PostgreSQL tras bambalinas:**
  ```sql
  -- Si ejecutas: $cliente->ventas;
  SELECT * FROM venta WHERE venta.id_cliente = 5;
  ```
* **Aplicación en el sistema:**
  - Consultar el historial de compras o pedidos de un cliente.
  - Validar integridad de datos antes de dar de baja: si `$cliente->ventas()->exists()`, no se debe eliminar físicamente el registro para no perder trazabilidad histórica de caja.

---

## 4. Preguntas Típicas de Examen sobre este Paso

1. **¿Qué pasa si agrego una columna a la tabla pero no la agrego al modelo?**  
   *Respuesta:* Si se intenta guardar usando asignación masiva (`Cliente::create($request->validated())`), Eloquent filtrará y descartará ese campo, por lo que nunca se guardará en la base de datos a menos que esté en el array `$fillable`.
2. **¿Por qué la relación `hasMany` lleva dos veces `'id_cliente'`?**  
   *Respuesta:* Porque la convención de Laravel busca `cliente_id` (en la tabla externa) y `id` (en la tabla local). Como nuestra base de datos utiliza `id_cliente` en ambas tablas, se deben especificar explícitamente ambos parámetros.
3. **¿Qué es un Accesor y cuándo se usa?**  
   *Respuesta:* Es un método que intercepta la lectura de un atributo para transformar un dato existente o calcular un valor virtual en memoria (como `nombre_completo`), sin almacenarlo de forma redundante en la base de datos.

# Lógica de Negocio: Almacenes e Inventario (CU18)

Este documento detalla la lógica interna, el modelo de datos y cómo interactúan las piezas en el módulo de Almacenes y Existencias que implementamos.

## 1. Naturaleza de los Almacenes

De acuerdo a las reglas de negocio (establecidas en `AGENTS.md`), **Dulce Bocado** opera de manera estricta con **3 almacenes fijos**:
1. **Materias Primas:** Destinado a almacenar ingredientes puros.
2. **Producción:** Destinado al inventario en proceso o transitorio durante la fabricación.
3. **Mostrador:** Destinado a los productos terminados (presentaciones) listos para la venta.

**Restricción de negocio:** Los almacenes no se crean, editan ni eliminan mediante una interfaz de usuario. Son fijos y obligatorios. Para garantizar esto a nivel de base de datos, se implementó un `AlmacenSeeder` que los inicializa automáticamente, impidiendo así que el sistema funcione sin ellos.

## 2. El Inventario como Libro Mayor (Ledger)

En lugar de crear una tabla separada para "Stock de Materias Primas" y otra para "Stock de Productos Terminados", la base de datos utiliza una **única tabla centralizada llamada `inventario`**.

Esta tabla funciona bajo el principio de vinculación polimórfica lógica:
- Si el registro pertenece a una materia prima, la columna `id_materia_prima` tiene valor y `id_producto_presentacion` es `null`.
- Si el registro pertenece a un producto terminado listo para la venta, la columna `id_producto_presentacion` tiene valor y `id_materia_prima` es `null`.

### Ventajas de este modelo:
- **Centralización:** Con un solo query se puede saber qué hay en un almacén en particular, sin importar si es un insumo o un postre terminado.
- **Trazabilidad:** Facilita las operaciones futuras (ingresos, egresos, ajustes), ya que todo se transacciona sobre una misma estructura (la tabla `inventario`).

## 3. Lógica del Controlador (`AlmacenController`)

El backend debe procesar la tabla `inventario` para entregar información digerida al Frontend. 

Cuando el usuario solicita ver las existencias de un almacén (`GET /api/almacenes/{id}/existencias`), el controlador hace lo siguiente:
1. Filtra los registros de la tabla `inventario` para que coincidan con el `id_almacen` solicitado.
2. Utiliza **Eager Loading** (Carga ansiosa) en Laravel con el método `with()` para adjuntar (hidratar) los datos relacionados de un solo golpe:
   - Carga la relación `materiaPrima` (para saber su nombre, medida, etc.).
   - Carga la relación `productoPresentacion.producto` (para saber el nombre del postre general y la especificación de la presentación).
3. Devuelve al frontend una colección unificada donde cada ítem tiene su `cantidad` y su `ultima_actualizacion`, acompañado de la data real de lo que representa (ya sea materia prima o presentación).

## 4. Consolidación Visual en el Frontend

La vista `ExistenciaList.jsx` recibe este JSON unificado. La lógica de presentación evalúa el tipo de ítem en tiempo real:
- Si detecta que el objeto tiene la propiedad `producto_presentacion`, renderiza el ítem como **Producto Terminado** y le asigna la unidad "unidades".
- Si detecta la propiedad `materia_prima`, lo marca como **Materia Prima** y extrae la unidad (gramos, ml, etc.) definida directamente en la base de datos de esa materia prima.

De esta forma, se mantiene el código modular y extensible; si el día de mañana se agrega otro tipo de artículo (ej. Insumos de Empaque), el backend y la tabla de `inventario` ya están preparados para soportarlo sin reconstruir la arquitectura.

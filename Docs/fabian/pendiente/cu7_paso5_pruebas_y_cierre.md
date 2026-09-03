# CU7 — Paso 5: Pruebas Integrales, Verificación y Cierre Oficial

Este documento detalla la batería de pruebas de aceptación y el checklist final para dar por concluido oficialmente el **Caso de Uso 7 (CU7): Gestionar Productos y Presentaciones**.

---

## 1. Batería de Pruebas Manuales (E2E)

### 1.1. Verificación de Menú y Navegación
1. Iniciar sesión como `admin` en `http://localhost:5173`.
2. Verificar que en la barra lateral izquierda aparezca la sección **Catálogo y Recetas** con la opción **Productos y Presentaciones**.
3. Comprobar que al hacer clic redirija limpiamente a `/productos` sin errores en la consola del navegador.

### 1.2. Prueba de Gestión de Categorías
1. Clic en *"Gestionar Categorías"*.
2. Registrar:
   - Nombre: `Tortas Clásicas`, Descripción: `Tortas tradicionales y de cumpleaños`.
   - Nombre: `Postres Fríos`, Descripción: `Postres refrigerados en porciones`.
3. Validar que no permita guardar una categoría con el mismo nombre (error 422 duplicado).

### 1.3. Prueba de Creación de Productos
1. Clic en *"Nuevo Producto"*.
2. Registrar:
   - Categoría: `Tortas Clásicas`.
   - Nombre: `Torta Selva Negra`.
   - Descripción: `Bizcochuelo de chocolate relleno con crema chantilly y cerezas`.
3. Verificar que aparezca en la tabla con `0 presentaciones` asociadas y estado `Activo`.

### 1.4. Prueba de Presentaciones y Precios (Regla de Oro de CU7)
1. Clic en *"Ver / Gestionar Presentaciones"* de `Torta Selva Negra`.
2. Registrar Presentación 1:
   - Nombre: `Porción Individual (150 g)`.
   - Precio: `15.00`.
   - Permite personalización: `No`.
3. Registrar Presentación 2:
   - Nombre: `Torta Entera 1 Kg`.
   - Precio: `95.00`.
   - Permite personalización: `Sí` (adhesión de dedicatoria/decoración).
4. Validar restricciones:
   - Intentar guardar precio `0` o `-10.00`: debe mostrar error de validación y ser rechazado.
5. Comprobar que el contador de presentaciones en la tabla de productos aumente a `2`.

### 1.5. Prueba de Cambios de Estado
1. Desactivar una presentación específica y verificar que su badge cambie a `Inactivo`.
2. Desactivar el producto completo y verificar que se refleje inmediatamente en la interfaz.

### 1.6. Prueba de Seguridad (RBAC)
1. Iniciar sesión con un usuario que **no** posea el rol de Administrador ni el permiso `productos.gestionar_producto`.
2. Comprobar que:
   - La opción no es visible en la barra lateral.
   - Si intenta ingresar directamente por URL a `http://localhost:5173/productos`, el sistema redirija a `/acceso-denegado`.

---

## 2. Checklist de Cierre de CU7

Antes de dar el caso de uso por terminado, asegurar:

- [ ] Las 3 migraciones fueron aplicadas con éxito sin tocar migraciones históricas.
- [ ] La regla de negocio de no fusionar `Producto` y `Presentación` se respeta fielmente.
- [ ] El backend cuenta con validaciones Form Requests estrictas y códigos HTTP semánticos (200, 201, 403, 422).
- [ ] El frontend maneja estados de carga, confirmaciones y mensajes de error amigables.
- [ ] No se instalaron dependencias ni librerías adicionales no autorizadas.

---

## 3. Acciones de Cierre

1. **Actualizar [AGENTS.md](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/AGENTS.md):**
   - Marcar el CU7 como completado en la tabla oficial:
     ```markdown
     | CU7 | Gestionar Productos y Presentaciones | ✅ COMPLETADO |
     ```
2. **Generar resumen en `Docs/fabian/realizado/`:**
   - Crear `Docs/fabian/realizado/resumen_cu7.md` documentando las tablas, endpoints y componentes implementados.

# CU7: Gestionar Productos y Presentaciones — Hoja de Ruta General

Este documento coordina la implementación paso a paso del **Caso de Uso 7 (CU7): Gestionar Productos y Presentaciones**, dividiéndolo en 5 fases secuenciales para garantizar cero errores, mantener la consistencia con las reglas de [AGENTS.md](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/AGENTS.md) y facilitar pruebas unitarias en cada etapa.

---

## Reglas Críticas del Módulo (según AGENTS.md)

1. **Separación estricta de entidades:** Un producto puede tener una o varias presentaciones. **Está estrictamente prohibido fusionar `Producto` y `Presentación` en una sola tabla/entidad.**
2. **Presentaciones independientes:** Cada presentación tiene su propio nombre (ej. *"Porción individual"*, *"Torta entera 1 Kg"*, *"Caja x 6"*), su propio precio, su estado de disponibilidad (`activo`) y su descripción.
3. **Personalización:** Flag booleano (`permite_personalizacion`) para indicar si la presentación admite decoraciones, mensajes o costos adicionales (base para CU10 Ventas y CU14 Pedidos).
4. **Impacto en futuros módulos:**
   - **CU9 (Recetas):** Cada receta se vincula a una `Presentacion`.
   - **CU18 (Inventario/Almacenes):** El stock terminado en mostrador se controla por `Presentacion`.
   - **CU10 (Ventas) y CU14 (Pedidos):** Se cotizan y venden `Presentaciones`.
5. **Base de Datos:** Convención inmutable del proyecto:
   - Primary keys: `id_categoria`, `id_producto`, `id_presentacion`.
   - Timestamps: `fecha_creacion`, `fecha_actualizacion`.
   - Estado: `activo` (boolean).
   - No modificar migraciones históricas existentes.

---

## Secuencia de Ejecución (Paso a Paso)

| Paso | Documento Guía | Alcance | Dependencias Previas |
| :---: | :--- | :--- | :--- |
| **01** | [`cu7_paso1_base_de_datos_y_permisos.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/Docs/fabian/pendiente/cu7_paso1_base_de_datos_y_permisos.md) | 4 Migraciones (`categoria`, `producto`, `presentacion`, `producto_presentacion`) y Seeder de Permisos RBAC. | CU1–CU6 completados |
| **02** | [`cu7_paso2_modelos_y_requests.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/Docs/fabian/pendiente/cu7_paso2_modelos_y_requests.md) | Modelos Eloquent con relaciones y Form Requests con reglas de validación. | Paso 01 ejecutado |
| **03** | [`cu7_paso3_controladores_y_rutas_backend.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/Docs/fabian/pendiente/cu7_paso3_controladores_y_rutas_backend.md) | Controladores REST API y configuración de rutas protegidas por Sanctum + RBAC. | Paso 02 ejecutado |
| **04** | [`cu7_paso4_servicios_y_vistas_frontend.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/Docs/fabian/pendiente/cu7_paso4_servicios_y_vistas_frontend.md) | Servicios de API frontend, vistas completas, modales de gestión y rutas React. | Paso 03 ejecutado |
| **05** | [`cu7_paso5_pruebas_y_cierre.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/Docs/fabian/pendiente/cu7_paso5_pruebas_y_cierre.md) | Pruebas integrales E2E, verificación de roles, checklist y cierre oficial en AGENTS.md. | Paso 04 ejecutado |

---

## Flujo de Trabajo Obligatorio

> [!IMPORTANT]
> **Desarrollo paso a paso:**
> `Paso 1 (BD)` → `Paso 2 (Modelos/Requests)` → `Paso 3 (Controladores/Rutas)` → `Paso 4 (Frontend)` → `Paso 5 (Pruebas y Cierre)`.
> No avanzar al siguiente paso hasta haber validado el anterior mediante sus criterios de aceptación y comandos de verificación.

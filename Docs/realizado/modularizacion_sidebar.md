# Resumen de Ejecución: Modularización y Desacoplamiento de la Barra Lateral (Sidebar)

## 1. Objetivo del Cambio
- **Organización visual:** Convertir las opciones del módulo de Seguridad en un menú desplegable (acordeón) interactivo para no saturar la vista del usuario en la barra lateral izquierda.
- **Buenas prácticas en React (SRP):** Desacoplar la barra lateral de `MainLayout.jsx` hacia un componente independiente `Sidebar.jsx`.
- **Escalabilidad hacia los 27 Casos de Uso (CU):** Dejar la navegación preparada con la estructura modular de todo el sistema (Catálogo, Producción, Inventario, Ventas, Pedidos, Compras, Reportes) respetando el filtrado por permisos RBAC.

---

## 2. Archivos Afectados

### A. Componente Nuevo: `frontend/src/components/Sidebar.jsx`
- **Estructura `SECCIONES_MENU`**: Define centralizadamente los módulos del sistema con sus rutas y el permiso `modulo.accion` requerido.
  - **Inicio** (`/`): Enlace raíz siempre accesible.
  - **Seguridad**: Opciones operativas de los CU2–CU6 (`Usuarios`, `Roles`, `Permisos`, `Rol - Permiso`, `Asignaciones`).
  - **Módulos futuros preparados**: *Catálogo y Recetas*, *Producción*, *Inventario*, *Ventas y Comercial*, *Pedidos*, *Clientes*, *Compras* y *Reportes*.
- **Control de Acceso (RBAC)**: Consume `tienePermiso(opcion.permiso)` de `AuthContext`. Si el usuario no cuenta con permisos para ninguna opción de una sección, esta no se renderiza.
- **Interactividad Desplegable**:
  - Estado `seccionesAbiertas` para controlar qué módulos están desplegados o colapsados.
  - Expande por defecto la sección activa según la URL actual (`useLocation()`).
  - Botón de título con indicador de flecha animado (chevron con rotación CSS).
  - Estilos consistentes con Tailwind CSS (`bg-pink-100 text-pink-700` para rutas activas).

### B. Componente Modificado: `frontend/src/layouts/MainLayout.jsx`
- **Reducción de líneas**: Se redujo de 182 a 87 líneas de código limpio.
- **Enfoque en su responsabilidad única (Shell)**:
  - Header global (marca *Dulce Bocado*, datos del usuario, roles activos y botón de logout con su manejo de errores).
  - Grilla de distribución (`lg:grid-cols-[240px_1fr]`).
  - Renderiza `<Sidebar />` en la columna lateral y `<Outlet />` en el área de contenido principal.

---

## 3. Comunicación y Roles entre Componentes

```text
MainLayout.jsx (Shell / Distribución espacial)
 ├── Header (Marca, Usuario, Logout)
 ├── Notificaciones de sesión (errorLogout)
 ├── Grilla:
 │    ├── <Sidebar />  ──> Consume AuthContext (tienePermiso) y controla el menú lateral
 │    └── <Outlet />   ──> Renderiza la página hija activa según la ruta
```

- **Composición declarativa**: `MainLayout` delega el menú a `<Sidebar />` sin requerir paso excesivo de props.
- **Autosuficiencia**: `Sidebar` lee directamente la sesión y el estado de la ruta mediante hooks de React (`useAuth`, `useLocation`).

---

## 4. Beneficios Técnicos y Cumplimiento de Reglas
1. **Menor riesgo en Git**: `MainLayout.jsx` es un archivo compartido y sensible según `AGENTS.md`. Al mover el menú a `Sidebar.jsx`, futuros desarrollos de CU agregarán sus rutas sin generar conflictos de fusión sobre el layout principal.
2. **Cero dependencias externas**: Implementado puramente con React estándar, `react-router-dom` y Tailwind CSS.
3. **Compatibilidad total**: No alteró rutas, autenticación Sanctum ni la protección de vistas con `ProtectedRoute`.

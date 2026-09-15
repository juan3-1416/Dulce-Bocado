# Resumen CU22: Registrar Visitas

## Objetivo Completado
Se ha implementado con éxito el **CU22 | Registrar Visitas**, cuyo propósito es registrar de manera atómica el número de visitas recibidas por cada página de la aplicación web y mostrar dicho contador actualizado en el pie de página (footer) de todas las secciones del sistema.

---

## Componentes Implementados

### 1. Base de Datos y Modelo
- **Migración (`2026_09_14_000001_create_visita_table.php`):**
  Crea la tabla `visita` en PostgreSQL con la siguiente estructura:
  - `id_visita` (`bigIncrements`): Clave primaria autoincremental.
  - `ruta` (`string`, 255): Identificador único e indexado de la página web (ejemplo: `/`, `/login`, `/productos`, `/ventas`).
  - `cantidad` (`bigInteger`): Contador de visitas acumuladas (default `0`).
  - `fecha_creacion` y `fecha_actualizacion` (`timestamp`): Fechas de control de auditoría.
- **Modelo Eloquent (`App\Models\Visita`):**
  - Mapeado a la tabla `visita` con clave primaria `id_visita`.
  - Configurado con las constantes de auditoría `CREATED_AT = 'fecha_creacion'` y `UPDATED_AT = 'fecha_actualizacion'`.

### 2. Controlador y Rutas (Backend Laravel)
- **Form Request (`RegistrarVisitaRequest`):** Valida la presencia y formato correcto del parámetro `ruta` (cadena de texto, máximo 255 caracteres).
- **Controlador (`VisitaController`):**
  - `registrar`: Recibe la ruta, la normaliza (manejando fallbacks y barras finales) y ejecuta una operación atómica (`firstOrCreate` + `increment('cantidad')`), garantizando que no existan condiciones de carrera ni duplicados. Devuelve un objeto JSON con la ruta y la cantidad actualizada.
  - `index`: Retorna el listado de todas las rutas registradas con sus respectivos contadores.
- **Rutas API (`routes/api.php`):**
  - `POST /api/visitas/registrar`: Endpoint para registrar/incrementar la visita de la ruta actual.
  - `GET /api/visitas`: Endpoint para consultar el catálogo completo de visitas.

### 3. Servicio y Componentes (Frontend React)
- **Servicio (`visitaService.js`):**
  - Función `registrarVisita(ruta)` para consumir el endpoint `POST /api/visitas/registrar`.
  - Función `obtenerVisitas()` para consumir el endpoint `GET /api/visitas`.
- **Componente de Pie de Página (`Footer.jsx`):**
  - Utiliza el hook `useLocation()` de React Router para detectar automáticamente cada cambio de URL en la aplicación.
  - Ejecuta de forma asíncrona y transparente la llamada a `registrarVisita(location.pathname)`.
  - Renderiza un diseño elegante con la marca "Dulce Bocado" y una insignia visual que muestra en tiempo real las visitas acumuladas de la página actual (ej. *Visitas a esta página: 42*).
- **Integración Global:**
  - **`MainLayout.jsx`:** Incluye el `<Footer />` en el diseño flex principal, cubriendo todas las vistas autenticadas del sistema.
  - **Páginas Públicas y de Error:** Incluye el `<Footer />` en `LoginPage.jsx` (inicio de sesión), `AccesoDenegadoPage.jsx` (error 403) y `NotFoundPage.jsx` (error 404).

---

## Lógica de Funcionamiento Paso a Paso

1. **Navegación del Usuario:** El usuario ingresa o cambia de página en la aplicación web (por ejemplo, navega a `/productos` o entra a la pantalla de `/login`).
2. **Detección de Ruta:** El componente `<Footer />`, mediante `useLocation()`, detecta la nueva ruta activa.
3. **Petición HTTP:** El frontend realiza una llamada `POST /api/visitas/registrar` enviando `{ "ruta": "/productos" }`.
4. **Procesamiento Atómico:**
   - Si la ruta `/productos` ya existe en la base de datos PostgreSQL, el backend incrementa su columna `cantidad` en `+1`.
   - Si la ruta es visitada por primera vez, el backend crea el registro con `cantidad = 1`.
5. **Respuesta y Actualización:** El servidor devuelve el objeto `visita` actualizado y el `<Footer />` actualiza dinámicamente el contador visible en pantalla.

---

## Estado en la Documentación del Proyecto
Se actualizó la tabla oficial de casos de uso en el archivo [`AGENTS.md`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/AGENTS.md) marcando el **CU22 | Registrar Visitas** como `✅ COMPLETADO`.

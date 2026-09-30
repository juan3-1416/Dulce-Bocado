# Paso 4: Las Vistas en React (SPA) — Módulo Clientes (CU8)

Este documento detalla el funcionamiento interno de la capa visual y de interacción del **Módulo de Clientes**, sirviendo como guía de estudio para la defensa técnica del proyecto **Dulce Bocado**.

---

## 1. Rol en la Arquitectura: La "V" en un Sistema Desacoplado

En una arquitectura web clásica monolítica (como Laravel con Blade), las vistas son plantillas `.blade.php` que el servidor procesa y envía al navegador como HTML pre-renderizado.

En **Dulce Bocado**, el sistema utiliza una **Arquitectura Desacoplada (API REST con Laravel + Single Page Application con React)**:
* El **Backend** nunca genera HTML; solo procesa lógica y responde datos puros en formato **JSON**.
* La **Vista (V)** vive enteramente en el cliente (navegador web), construida con **React, Vite y Tailwind CSS**.
* La Vista es **reactiva**: no recarga toda la página web al interactuar (SPA), sino que actualiza únicamente las partes del DOM que cambiaron según el **Estado (`state`)**.

### Estructura de la Capa de Vista para Clientes
La capa de vistas del módulo de clientes está modularizada en 3 niveles complementarios:
1. **Capa de Servicio HTTP:** [`frontend/src/services/clienteService.js`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/frontend/src/services/clienteService.js)  
   Se encarga de la comunicación asíncrona por red, seguridad CSRF y consumo de la API REST.
2. **Página Contenedora (Vista Principal):** [`frontend/src/pages/clientes/ClientesPage.jsx`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/frontend/src/pages/clientes/ClientesPage.jsx)  
   Administra el estado global del módulo (listado, filtros, métricas, carga y apertura de modales).
3. **Componente de Interacción / Modal:** [`frontend/src/pages/clientes/ClienteModal.jsx`](file:///c:/Materias_FINOR/TecnoWeb/Dulce-Bocado/frontend/src/pages/clientes/ClienteModal.jsx)  
   Encapsula el formulario de creación/edición, la sincronización de campos y la recepción visual de errores de validación HTTP 422.

---

## 2. Capa de Comunicación: `clienteService.js`

El archivo de servicio es la **frontera** entre React y los controladores de Laravel. Evita escribir llamadas `fetch()` dispersas en los componentes y centraliza la seguridad y los endpoints.

### 2.1. Seguridad Sanctum y Protección CSRF
Laravel Sanctum protege los endpoints mediante cookies de sesión y tokens anti-falsificación (CSRF). El servicio lo gestiona con tres funciones base:

```javascript
// 1. Obtiene la cookie XSRF-TOKEN que Laravel envía al navegador
function obtenerTokenCsrf() {
    const token = obtenerCookie('XSRF-TOKEN');
    return token ? decodeURIComponent(token) : null;
}

// 2. Si no existe la cookie, inicializa la protección contactando a Sanctum
async function prepararCsrf() {
    await fetch('/sanctum/csrf-cookie', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
}
```

* **`credentials: 'include'`:**  
  Es crucial. Le indica al navegador que **debe adjuntar automáticamente las cookies de sesión** en las peticiones a la API. Sin esto, Laravel respondería `401 Unauthorized`.
* **Header `X-XSRF-TOKEN`:**  
  En métodos mutadores (`POST`, `PUT`, `PATCH`), se extrae el token de la cookie y se envía en la cabecera HTTP para que Laravel verifique que la petición proviene genuinamente de nuestra aplicación React y no de un sitio web malicioso externo (ataque CSRF).

### 2.2. Procesamiento de Respuestas y Captura de Errores

```javascript
async function procesarRespuesta(response) {
    let data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.message || 'Error al procesar la solicitud.');
        error.status = response.status;
        error.data = data; // Contiene el JSON con los errores de validación de Laravel
        throw error;
    }

    return data;
}
```

Si el servidor responde con un código de error (como `422 Unprocessable Content` de un Form Request):
1. Detecta que `response.ok` es `false`.
2. Empaqueta el código de estado (`error.status = 422`) y la data devuelta (`error.data.errors`).
3. Lanza la excepción para que el componente visual (el modal o la página) la atrape y la muestre al usuario.

---

## 3. La Vista Principal: `ClientesPage.jsx`

Este componente representa la pantalla visual completa que el usuario ve cuando entra al menú **"Clientes"**.

### 3.1. Gestión del Estado Reactivo (`useState`)
La vista mantiene en memoria variables reactivas que definen lo que se dibuja en pantalla:

```javascript
const [clientes, setClientes] = useState([]);               // Lista de clientes traídos de PostgreSQL
const [cargando, setCargando] = useState(true);             // Estado de carga para feedback visual
const [error, setError] = useState('');                     // Mensajes de error general
const [mensajeExito, setMensajeExito] = useState('');       // Notificaciones de éxito verdes
const [filtros, setFiltros] = useState({ buscar: '', estado: '' }); // Parámetros de búsqueda
const [modalAbierto, setModalAbierto] = useState(false);    // Control de visibilidad del modal
const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // Cliente en edición (o null si es nuevo)
```

### 3.2. Ciclo de Vida y Carga de Datos (`useEffect` y `useCallback`)

```javascript
const cargarClientes = useCallback(async () => {
    try {
        setCargando(true);
        const respuesta = await listarClientes(filtros);
        setClientes(respuesta.clientes ?? []);
    } catch (err) {
        setError(err.message || 'Error al cargar los clientes.');
    } finally {
        setCargando(false);
    }
}, [filtros]);

useEffect(() => {
    cargarClientes();
}, [cargarClientes]);
```

* **Reactividad ante filtros:** Cada vez que el usuario escribe en la barra de búsqueda o cambia el selector de estado, el objeto `filtros` cambia, provocando que `useEffect` invoque automáticamente a `cargarClientes()`.
* **Sin recarga:** Los datos se actualizan fluidamente sin parpadeos ni recargas de página.

### 3.3. Métricas en Memoria (`useMemo`)

```javascript
const metricas = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter((c) => c.estado).length;
    const conTelefono = clientes.filter((c) => Boolean(c.telefono)).length;
    return { total, activos, conTelefono };
}, [clientes]);
```

* Calcula en tiempo real las tarjetas informativas superiores (Total Clientes, Clientes Activos, Con Teléfono).
* **Rendimiento:** `useMemo` evita recalcular estas estadísticas en cada re-renderizado a menos que el array `clientes` haya cambiado.

### 3.4. Cambio de Estado Rápido (Soft-Deactivation)

```javascript
const alternarEstado = async (cliente) => {
    const accion = cliente.estado ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} al cliente "${cliente.nombre}"?`)) {
        return;
    }

    try {
        await cambiarEstadoCliente(cliente.id_cliente, !cliente.estado);
        setMensajeExito(`Cliente ${cliente.estado ? 'desactivado' : 'activado'} correctamente.`);
        cargarClientes(); // Refresca la tabla
    } catch (err) {
        alert(err.message || 'Error al cambiar el estado.');
    }
};
```
* Conecta el botón de la tabla directamente con la ruta `PATCH /api/clientes/{id}/estado`.

---

## 4. El Componente Formulario: `ClienteModal.jsx`

Es la ventana emergente para registrar o editar un cliente. Implementa el patrón de **Componentes Controlados** y la integración directa con los errores de Laravel.

### 4.1. Componente Controlado
En React, un input se denomina "controlado" cuando su valor visual está gobernado por el estado de React:

```javascript
<input
    type="text"
    name="nombre"
    value={formulario.nombre}
    onChange={manejarCambio}
/>
```

La función `manejarCambio` actualiza el estado por cada tecla presionada:
```javascript
const manejarCambio = (e) => {
    const { name, value, type, checked } = e.target;
    setFormulario((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
    }));
    // Si el campo tenía un error previo de validación, se limpia al volver a escribir:
    if (errores[name]) {
        setErrores((prev) => ({ ...prev, [name]: null }));
    }
};
```

### 4.2. Cómo la Vista Atrapa los Errores 422 de Laravel

Este es el punto más importante para la defensa técnica: **¿Cómo se conecta el Form Request de Laravel con la interfaz de React?**

1. El usuario llena el formulario y presiona **"Guardar Cliente"**.
2. Se ejecuta `manejarEnvio(e)`:
   ```javascript
   try {
       if (cliente?.id_cliente) {
           await actualizarCliente(cliente.id_cliente, payload); // PUT
       } else {
           await crearCliente(payload); // POST
       }
       alGuardarExitoso();
       alCerrar();
   } catch (err) {
       // Si Laravel rechazó los datos (HTTP 422 de StoreClienteRequest):
       if (err.data?.errors) {
           setErrores(err.data.errors); // Guarda el mapa de errores
       } else {
           setErrorGeneral(err.message);
       }
   }
   ```
3. Laravel envió en el cuerpo de la respuesta:
   ```json
   {
       "errors": {
           "ci_nit": ["El ci nit ya ha sido registrado."],
           "nombre": ["El campo nombre es obligatorio."]
       }
   }
   ```
4. El JSX renderiza condicionalmente el mensaje debajo del input y pinta el borde de color rojo:
   ```jsx
   <input
       name="ci_nit"
       value={formulario.ci_nit}
       className={`... ${errores.ci_nit ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}
   />
   {errores.ci_nit && (
       <p className="mt-1 text-xs text-red-600 font-medium">
           {errores.ci_nit[0]}
       </p>
   )}
   ```

---

## 5. El Ciclo Completo del MVC (El Viaje de Ida y Vuelta)

Juntando los 4 pasos estudiados (`Modelo`, `Rutas/Requests`, `Controlador`, `Vistas`), el flujo completo de una operación se resume así:

```
[1. Vista (React: ClienteModal.jsx)]
  El usuario hace clic en "Guardar Cliente".
  Dispara manejarEnvio() ➔ llama a crearCliente(payload).
          │
          ▼
[2. Servicio Frontend (clienteService.js)]
  Prepara CSRF (/sanctum/csrf-cookie).
  Ejecuta fetch('POST', '/api/clientes', body: JSON, credentials: 'include').
          │
          ▼
[3. Red HTTP]
  La petición viaja al Backend Laravel.
          │
          ▼
[4. Rutas y Filtros (backend/routes/api.php)]
  Middleware auth:sanctum valida la sesión.
  Middleware permiso:clientes.gestionar_cliente autoriza el permiso RBAC.
          │
          ▼
[5. Aduana de Validación (StoreClienteRequest.php)]
  Comprueba 'nombre' obligatorio, 'ci_nit' único en PostgreSQL, etc.
  - Si falla: Cancela la petición y devuelve HTTP 422 con array de errores.
  - Si pasa: Continúa al controlador.
          │
          ▼
[6. Controlador (ClienteController.php - método store)]
  Recibe los datos limpios de $request->validated().
  Invoca al Modelo Eloquent: Cliente::create(...).
          │
          ▼
[7. Modelo Eloquent y Base de Datos (Cliente.php -> PostgreSQL)]
  Inserta la fila en la tabla física "cliente" respetando $fillable y casts.
          │
          ▼
[8. Respuesta del Controlador]
  Retorna JSON con código HTTP 201 Created y el objeto cliente recién generado.
          │
          ▼
[9. Regreso a la Vista (React)]
  clienteService.js recibe el JSON 201 y resuelve la Promesa.
  ClienteModal ejecuta alGuardarExitoso() y alCerrar().
  ClientesPage ejecuta cargarClientes() ➔ la tabla se actualiza inmediatamente en pantalla.
```

---

## 6. Preguntas Típicas de Examen sobre este Paso

1. **¿Dónde están las "Vistas" en este sistema si Laravel no utiliza archivos Blade?**  
   *Respuesta:* Al ser una arquitectura desacoplada, la capa de Vista está completamente separada del backend y reside en la aplicación cliente de React (`frontend/src/pages/` y `frontend/src/components/`). El backend actúa únicamente como un proveedor de servicios de datos (API REST).
2. **¿Qué es un Componente Controlado en React y por qué se utiliza en los formularios?**  
   *Respuesta:* Es un componente donde los datos del formulario son controlados por el estado interno de React (`useState`). El valor del input refleja el estado (`value={formulario.campo}`) y cualquier cambio del usuario se canaliza mediante un manejador de eventos (`onChange`). Permite validar en tiempo real, deshabilitar botones y manipular datos antes de enviarlos.
3. **¿Cómo se coordinan las validaciones del Backend con la interfaz de usuario en el Frontend?**  
   *Respuesta:* Cuando el Form Request de Laravel detecta datos no válidos, responde con código HTTP `422` y un JSON estructurado con los errores por campo (`errors: { campo: ["mensaje"] }`). El servicio de React captura esa respuesta y la pasa al estado `errores` del componente modal, el cual renderiza mensajes rojos debajo de cada input correspondiente.
4. **¿Por qué es indispensable la opción `credentials: 'include'` en las peticiones `fetch()`?**  
   *Respuesta:* Porque la autenticación con Laravel Sanctum se basa en cookies de sesión seguras (SPA). Sin `credentials: 'include'`, el navegador omitiría las cookies en las solicitudes HTTP entre dominios o puertos, provocando un error `401 Unauthorized` por falta de sesión.

import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    actualizarEstadoPermiso,
    actualizarPermiso,
    crearPermiso,
    listarPermisos,
    obtenerPermiso,
} from '../../services/permisoService';

import './seguridad.css';

const formularioInicial = {
    nombre: '',
    descripcion: '',
};

function PermisosPage() {
    const [permisos, setPermisos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

        const [permisoEditando, setPermisoEditando] =
    useState(null);

const [cargandoEdicion, setCargandoEdicion] =
    useState(false);
    const [cambiandoEstadoId, setCambiandoEstadoId] =
    useState(null);

    const [formulario, setFormulario] =
        useState(formularioInicial);

    const [guardando, setGuardando] = useState(false);
    const [errorFormulario, setErrorFormulario] =
        useState('');

    const cargarPermisos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await listarPermisos();

            setPermisos(respuesta.permisos ?? []);
        } catch (errorPeticion) {
            if (errorPeticion.status === 403) {
                setError(
                    'No tienes permiso para gestionar permisos.'
                );
            } else if (errorPeticion.status === 401) {
                setError(
                    'Tu sesión ha expirado. Inicia sesión nuevamente.'
                );
            } else {
                setError(
                    errorPeticion.message ||
                    'No se pudieron cargar los permisos.'
                );
            }
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarPermisos();
    }, [cargarPermisos]);

    const manejarCambio = (event) => {
        const { name, value } = event.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value,
        }));
    };

const abrirNuevoPermiso = () => {
    setPermisoEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario('');
    setMensaje('');
    setMostrarFormulario(true);
};

const abrirEdicion = async (id) => {
    try {
        setCargandoEdicion(true);
        setError('');
        setErrorFormulario('');
        setMensaje('');

        const respuesta = await obtenerPermiso(id);
        const permiso = respuesta.permiso;

        setPermisoEditando(permiso);

        setFormulario({
            nombre: permiso.nombre ?? '',
            descripcion: permiso.descripcion ?? '',
        });

        setMostrarFormulario(true);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    } catch (errorPeticion) {
        setError(
            errorPeticion.message ||
            'No se pudo cargar el permiso.'
        );
    } finally {
        setCargandoEdicion(false);
    }
};

const cerrarFormulario = () => {
    setPermisoEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario('');
    setMostrarFormulario(false);
};

    const obtenerMensajeValidacion = (errorPeticion) => {
        const errores = errorPeticion.data?.errors;

        if (errores) {
            const primerError =
                Object.values(errores)[0];

            if (Array.isArray(primerError)) {
                return primerError[0];
            }
        }

        return (
            errorPeticion.message ||
            'No se pudo registrar el permiso.'
        );
    };

const manejarGuardado = async (event) => {
    event.preventDefault();

    try {
        setGuardando(true);
        setErrorFormulario('');
        setMensaje('');

        const datos = {
            nombre: formulario.nombre,
            descripcion:
                formulario.descripcion || null,
        };

        let respuesta;

        if (permisoEditando) {
            respuesta = await actualizarPermiso(
                permisoEditando.id_permiso,
                datos
            );
        } else {
            respuesta = await crearPermiso(datos);
        }

        setMensaje(
            respuesta.message ||
            (
                permisoEditando
                    ? 'Permiso actualizado correctamente.'
                    : 'Permiso registrado correctamente.'
            )
        );

        cerrarFormulario();
        await cargarPermisos();
    } catch (errorPeticion) {
        setErrorFormulario(
            obtenerMensajeValidacion(errorPeticion)
        );
    } finally {
        setGuardando(false);
    }

};
    const manejarCambioEstado = async (permiso) => {
    const nuevoEstado = !permiso.activo;

    const accion = nuevoEstado
        ? 'activar'
        : 'desactivar';

    const confirmado = window.confirm(
        `¿Seguro que deseas ${accion} el permiso "${permiso.nombre}"?`
    );

    if (!confirmado) {
        return;
    }

    try {
        setCambiandoEstadoId(permiso.id_permiso);
        setError('');
        setMensaje('');

        const respuesta =
            await actualizarEstadoPermiso(
                permiso.id_permiso,
                nuevoEstado
            );

        setMensaje(
            respuesta.message ||
            (
                nuevoEstado
                    ? 'Permiso activado correctamente.'
                    : 'Permiso desactivado correctamente.'
            )
        );

        await cargarPermisos();
    } catch (errorPeticion) {
        setError(
            errorPeticion.message ||
            'No se pudo modificar el estado del permiso.'
        );
    } finally {
        setCambiandoEstadoId(null);
    }
};


return (
    <section className="security-page min-w-0 space-y-6 pb-10 text-theme-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
                    Gestión de Permisos
                </h1>

                <p className="mt-1 text-sm text-theme-body">
                    Administra los permisos disponibles en Dulce Bocado.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={cargarPermisos}
                    className="rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover"
                >
                    Actualizar
                </button>

                <button
                    type="button"
                    onClick={abrirNuevoPermiso}
                    className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                >
                    Nuevo Permiso
                </button>
            </div>
        </div>

        {mensaje && (
            <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {mensaje}
            </div>
        )}

        {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
            </div>
        )}

        {mostrarFormulario && (
            <div className="max-w-3xl rounded-xl border border-theme-border-subtle bg-theme-surface p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-theme-heading">
                    {permisoEditando
                        ? 'Editar Permiso'
                        : 'Registrar Permiso'}
                </h2>

                <p className="mt-1 text-sm text-theme-muted">
                    {permisoEditando
                        ? 'Modifica los datos del permiso seleccionado.'
                        : 'Registra un nuevo permiso del sistema. La asociación con roles se realizará posteriormente en Rol-Permiso.'}
                </p>

                {errorFormulario && (
                    <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {errorFormulario}
                    </div>
                )}

                <form
                    onSubmit={manejarGuardado}
                    className="mt-5 space-y-4"
                >
                    <div>
                        <label
                            htmlFor="nombre"
                            className="mb-1 block text-sm font-medium text-theme-body"
                        >
                            Nombre del permiso
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            required
                            maxLength={100}
                            placeholder="ejemplo.gestionar_modulo"
                            className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="descripcion"
                            className="mb-1 block text-sm font-medium text-theme-body"
                        >
                            Descripción
                        </label>

                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formulario.descripcion}
                            onChange={manejarCambio}
                            maxLength={255}
                            rows={3}
                            className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-theme-border-subtle pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={cerrarFormulario}
                            disabled={guardando}
                            className="rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover disabled:opacity-60"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                        >
                            {guardando
                                ? 'Guardando...'
                                : permisoEditando
                                  ? 'Guardar Cambios'
                                  : 'Registrar Permiso'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
            <div className="border-b border-theme-border-subtle px-4 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-theme-heading">Permisos <span className="ml-2 text-sm font-normal tabular-nums text-theme-muted">{permisos.length}</span></h2>
            </div>
            {cargando ? (
                <div className="p-8 text-center text-theme-muted">
                    Cargando permisos...
                </div>
            ) : permisos.length === 0 ? (
                <div className="p-8 text-center text-theme-muted">
                    No hay permisos registrados.
                </div>
            ) : (
                <div className="min-w-0">
                    <table className="security-table divide-y divide-theme-border-subtle" aria-label="Permisos registrados">
                        <thead className="bg-theme-subtle">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    ID
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Nombre
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Descripción
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Estado
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-theme-border-subtle bg-theme-surface">
                            {permisos.map((permiso) => (
                                <tr
                                    key={permiso.id_permiso}
                                    className="hover:bg-theme-hover"
                                >
                                    <td data-label="ID" className="px-6 py-4 text-sm text-theme-muted">
                                        {permiso.id_permiso}
                                    </td>

                                    <td data-label="Nombre" className="px-6 py-4 text-sm font-medium text-theme-heading">
                                        {permiso.nombre}
                                    </td>

                                    <td data-label="Descripción" className="px-6 py-4 text-sm text-theme-body">
                                        {permiso.descripcion ||
                                            'Sin descripción'}
                                    </td>

                                    <td data-label="Estado" className="px-6 py-4">
                                        <span
                                            className={
                                                permiso.activo
                                                    ? 'inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
                                                    : 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700'
                                            }
                                        >
                                            {permiso.activo
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </td>

<td data-label="Acciones" className="px-6 py-4">
    <div className="flex flex-wrap gap-2">
        <button
            type="button"
            onClick={() =>
                abrirEdicion(
                    permiso.id_permiso
                )
            }
            disabled={
                cargandoEdicion ||
                cambiandoEstadoId ===
                    permiso.id_permiso
            }
            className="rounded-lg border border-pink-200 px-3 py-1.5 text-sm font-semibold text-pink-700 hover:bg-pink-50 disabled:opacity-50"
        >
            Editar
        </button>

        <button
            type="button"
            onClick={() =>
                manejarCambioEstado(permiso)
            }
            disabled={
                cambiandoEstadoId ===
                    permiso.id_permiso
            }
            className={
                permiso.activo
                    ? 'rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
                    : 'rounded-lg border border-green-200 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50'
            }
        >
            {cambiandoEstadoId ===
            permiso.id_permiso
                ? 'Procesando...'
                : permiso.activo
                  ? 'Desactivar'
                  : 'Activar'}
        </button>
    </div>
</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </section>
);
}

export default PermisosPage;

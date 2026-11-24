import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    asignarRolPermiso,
    listarRolPermisos,
    obtenerCatalogosRolPermiso,
    quitarRolPermiso,
} from '../../services/rolPermisoService';

import './seguridad.css';

function RolPermisoPage() {
    const [relaciones, setRelaciones] =
        useState([]);

    const [roles, setRoles] =
        useState([]);

    const [permisos, setPermisos] =
        useState([]);

    const [rolSeleccionado, setRolSeleccionado] =
        useState('');

    const [
        permisoSeleccionado,
        setPermisoSeleccionado,
    ] = useState('');

    const [cargando, setCargando] =
        useState(true);

    const [asignando, setAsignando] =
        useState(false);
        const [quitandoId, setQuitandoId] =
    useState(null);

    const [error, setError] =
        useState('');

    const [mensaje, setMensaje] =
        useState('');

    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const [
                respuestaRelaciones,
                respuestaCatalogos,
            ] = await Promise.all([
                listarRolPermisos(),
                obtenerCatalogosRolPermiso(),
            ]);

            setRelaciones(
                respuestaRelaciones.relaciones ?? []
            );

            setRoles(
                respuestaCatalogos.roles ?? []
            );

            setPermisos(
                respuestaCatalogos.permisos ?? []
            );
        } catch (errorPeticion) {
            if (errorPeticion.status === 403) {
                setError(
                    'No tienes permiso para gestionar Rol-Permiso.'
                );
            } else if (
                errorPeticion.status === 401
            ) {
                setError(
                    'Tu sesión ha expirado. Inicia sesión nuevamente.'
                );
            } else {
                setError(
                    errorPeticion.message ||
                    'No se pudieron cargar las relaciones Rol-Permiso.'
                );
            }
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const permisosDisponibles = useMemo(() => {
        if (!rolSeleccionado) {
            return permisos;
        }

        const idRol =
            Number(rolSeleccionado);

        const permisosYaAsignados =
            relaciones
                .filter(
                    (relacion) =>
                        relacion.rol.id_rol === idRol
                )
                .map(
                    (relacion) =>
                        relacion.permiso.id_permiso
                );

        return permisos.filter(
            (permiso) =>
                !permisosYaAsignados.includes(
                    permiso.id_permiso
                )
        );
    }, [
        permisos,
        relaciones,
        rolSeleccionado,
    ]);

    const manejarCambioRol = (event) => {
        setRolSeleccionado(
            event.target.value
        );

        setPermisoSeleccionado('');
        setError('');
        setMensaje('');
    };

    const obtenerMensajeValidacion = (
        errorPeticion
    ) => {
        const errores =
            errorPeticion.data?.errors;

        if (errores) {
            const primerError =
                Object.values(errores)[0];

            if (Array.isArray(primerError)) {
                return primerError[0];
            }
        }

        return (
            errorPeticion.message ||
            'No se pudo asignar el permiso.'
        );
    };

    const manejarAsignacion = async (event) => {
        event.preventDefault();

        if (
            !rolSeleccionado ||
            !permisoSeleccionado
        ) {
            setError(
                'Selecciona un rol y un permiso.'
            );

            return;
        }

        try {
            setAsignando(true);
            setError('');
            setMensaje('');

            const respuesta =
                await asignarRolPermiso(
                    rolSeleccionado,
                    permisoSeleccionado
                );

            setMensaje(
                respuesta.message ||
                'Permiso asignado al rol correctamente.'
            );

            setPermisoSeleccionado('');

            await cargarDatos();
        } catch (errorPeticion) {
            setError(
                obtenerMensajeValidacion(
                    errorPeticion
                )
            );
        } finally {
            setAsignando(false);
        }
    };
    const manejarQuitar = async (relacion) => {
    const confirmado = window.confirm(
        `¿Seguro que deseas quitar el permiso "${relacion.permiso.nombre}" del rol "${relacion.rol.nombre}"?`
    );

    if (!confirmado) {
        return;
    }

    try {
        setQuitandoId(
            relacion.id_rol_permiso
        );

        setError('');
        setMensaje('');

        const respuesta =
            await quitarRolPermiso(
                relacion.id_rol_permiso
            );

        setMensaje(
            respuesta.message ||
            'Permiso quitado del rol correctamente.'
        );

        await cargarDatos();
    } catch (errorPeticion) {
        if (errorPeticion.status === 409) {
            setError(
                errorPeticion.message ||
                'No se puede quitar esta relación porque está asignada a uno o más usuarios.'
            );
        } else {
            setError(
                errorPeticion.message ||
                'No se pudo quitar el permiso del rol.'
            );
        }
    } finally {
        setQuitandoId(null);
    }
};

return (
    <section className="security-page min-w-0 space-y-6 pb-10 text-theme-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
                    Gestión Rol-Permiso
                </h1>

                <p className="mt-1 text-sm text-theme-body">
                    Administra los permisos asignados
                    a cada rol del sistema.
                </p>
            </div>

            <button
                type="button"
                onClick={cargarDatos}
                className="rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover"
            >
                Actualizar
            </button>
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

        <div className="rounded-xl border border-theme-border-subtle bg-theme-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-theme-heading">
                Asignar Permiso a Rol
            </h2>

            <p className="mt-1 text-sm text-theme-muted">
                Selecciona un rol y uno de los permisos
                que todavía no tenga asignado.
            </p>

            <form
                onSubmit={manejarAsignacion}
                className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
            >
                <div>
                    <label
                        htmlFor="rol_id"
                        className="mb-1 block text-sm font-medium text-theme-body"
                    >
                        Rol
                    </label>

                    <select
                        id="rol_id"
                        value={rolSeleccionado}
                        onChange={manejarCambioRol}
                        required
                        className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                    >
                        <option value="">
                            Seleccionar rol
                        </option>

                        {roles.map((rol) => (
                            <option
                                key={rol.id_rol}
                                value={rol.id_rol}
                            >
                                {rol.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="permiso_id"
                        className="mb-1 block text-sm font-medium text-theme-body"
                    >
                        Permiso
                    </label>

                    <select
                        id="permiso_id"
                        value={permisoSeleccionado}
                        onChange={(event) =>
                            setPermisoSeleccionado(
                                event.target.value
                            )
                        }
                        required
                        disabled={!rolSeleccionado}
                        className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:bg-theme-subtle"
                    >
                        <option value="">
                            {!rolSeleccionado
                                ? 'Primero selecciona un rol'
                                : permisosDisponibles.length === 0
                                  ? 'No hay permisos disponibles'
                                  : 'Seleccionar permiso'}
                        </option>

                        {permisosDisponibles.map(
                            (permiso) => (
                                <option
                                    key={permiso.id_permiso}
                                    value={permiso.id_permiso}
                                >
                                    {permiso.nombre}
                                </option>
                            )
                        )}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={
                        asignando ||
                        !rolSeleccionado ||
                        !permisoSeleccionado
                    }
                    className="min-h-11 rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 xl:col-span-1"
                >
                    {asignando
                        ? 'Asignando...'
                        : 'Asignar Permiso'}
                </button>
            </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
            <div className="border-b border-theme-border-subtle px-4 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-theme-heading">Permisos asignados <span className="ml-2 text-sm font-normal tabular-nums text-theme-muted">{relaciones.length}</span></h2>
            </div>
            {cargando ? (
                <div className="p-8 text-center text-theme-muted">
                    Cargando relaciones...
                </div>
            ) : relaciones.length === 0 ? (
                <div className="p-8 text-center text-theme-muted">
                    No existen relaciones Rol-Permiso.
                </div>
            ) : (
                <div className="min-w-0">
                    <table className="security-table divide-y divide-theme-border-subtle" aria-label="Permisos asignados a roles">
                        <thead className="bg-theme-subtle">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    ID
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Rol
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">
                                    Permiso
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
                            {relaciones.map((relacion) => (
                                <tr
                                    key={relacion.id_rol_permiso}
                                    className="hover:bg-theme-hover"
                                >
                                    <td data-label="ID" className="px-6 py-4 text-sm text-theme-muted">
                                        {relacion.id_rol_permiso}
                                    </td>

                                    <td data-label="Rol" className="px-6 py-4 text-sm font-semibold text-theme-heading">
                                        {relacion.rol.nombre}
                                    </td>

                                    <td data-label="Permiso" className="px-6 py-4 text-sm text-theme-body">
                                        {relacion.permiso.nombre}
                                    </td>

                                    <td data-label="Descripción" className="px-6 py-4 text-sm text-theme-body">
                                        {relacion.permiso.descripcion ||
                                            'Sin descripción'}
                                    </td>

                                    <td data-label="Estado" className="px-6 py-4">
                                        {relacion.rol.activo &&
                                        relacion.permiso.activo ? (
                                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                Activa
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                                Inactiva
                                            </span>
                                        )}
                                    </td>

                                    <td data-label="Acciones" className="px-6 py-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                manejarQuitar(
                                                    relacion
                                                )
                                            }
                                            disabled={
                                                quitandoId ===
                                                relacion.id_rol_permiso
                                            }
                                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {quitandoId ===
                                            relacion.id_rol_permiso
                                                ? 'Quitando...'
                                                : 'Quitar'}
                                        </button>
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

export default RolPermisoPage;

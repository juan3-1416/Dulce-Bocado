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
    <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Gestión Rol-Permiso
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Administra los permisos asignados
                    a cada rol del sistema.
                </p>
            </div>

            <button
                type="button"
                onClick={cargarDatos}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
                Actualizar
            </button>
        </div>

        {mensaje && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {mensaje}
            </div>
        )}

        {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
            </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
                Asignar Permiso a Rol
            </h2>

            <p className="mt-1 text-sm text-gray-500">
                Selecciona un rol y uno de los permisos
                que todavía no tenga asignado.
            </p>

            <form
                onSubmit={manejarAsignacion}
                className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
            >
                <div>
                    <label
                        htmlFor="rol_id"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Rol
                    </label>

                    <select
                        id="rol_id"
                        value={rolSeleccionado}
                        onChange={manejarCambioRol}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
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
                        className="mb-1 block text-sm font-medium text-gray-700"
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-100"
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
                    className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {asignando
                        ? 'Asignando...'
                        : 'Asignar Permiso'}
                </button>
            </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {cargando ? (
                <div className="p-8 text-center text-gray-500">
                    Cargando relaciones...
                </div>
            ) : relaciones.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    No existen relaciones Rol-Permiso.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    ID
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    Rol
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    Permiso
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    Descripción
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    Estado
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 bg-white">
                            {relaciones.map((relacion) => (
                                <tr
                                    key={relacion.id_rol_permiso}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {relacion.id_rol_permiso}
                                    </td>

                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                        {relacion.rol.nombre}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {relacion.permiso.nombre}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {relacion.permiso.descripcion ||
                                            'Sin descripción'}
                                    </td>

                                    <td className="px-6 py-4">
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

                                    <td className="px-6 py-4">
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
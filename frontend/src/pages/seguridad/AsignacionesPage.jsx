import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    asignarRolAUsuario,
    asignarUsuarioRolPermiso,
    listarUsuarioRolPermisos,
    obtenerCatalogosUsuarioRolPermiso,
    quitarRolAUsuario,
    quitarUsuarioRolPermiso,
} from '../../services/usuarioRolPermisoService';

function AsignacionesPage() {
    const [asignaciones, setAsignaciones] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [rolPermisos, setRolPermisos] = useState([]);

    // Filtros
    const [filtroUsuario, setFiltroUsuario] = useState('');
    const [filtroRol, setFiltroRol] = useState('');

    // Formulario Asignación por Rol
    const [usuarioRolSeleccionado, setUsuarioRolSeleccionado] = useState('');
    const [rolCompletoSeleccionado, setRolCompletoSeleccionado] = useState('');
    const [asignandoRol, setAsignandoRol] = useState(false);

    // Formulario Asignación Individual
    const [usuarioIndivSeleccionado, setUsuarioIndivSeleccionado] = useState('');
    const [rolPermisoSeleccionado, setRolPermisoSeleccionado] = useState('');
    const [asignandoIndiv, setAsignandoIndiv] = useState(false);

    // Estados de carga y acción
    const [cargando, setCargando] = useState(true);
    const [quitandoId, setQuitandoId] = useState(null);
    const [revocandoRol, setRevocandoRol] = useState(false);

    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const [respAsignaciones, respCatalogos] = await Promise.all([
                listarUsuarioRolPermisos(),
                obtenerCatalogosUsuarioRolPermiso(),
            ]);

            setAsignaciones(respAsignaciones.asignaciones ?? []);
            setUsuarios(respCatalogos.usuarios ?? []);
            setRoles(respCatalogos.roles ?? []);
            setRolPermisos(respCatalogos.rol_permisos ?? []);
        } catch (errorPeticion) {
            if (errorPeticion.status === 403) {
                setError('No tienes permiso para gestionar la asignación de roles y permisos.');
            } else if (errorPeticion.status === 401) {
                setError('Tu sesión ha expirado. Inicia sesión nuevamente.');
            } else {
                setError(
                    errorPeticion.message ||
                    'No se pudieron cargar las asignaciones de usuarios.'
                );
            }
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Relaciones rol-permiso disponibles para el usuario seleccionado en asignación individual
    const rolPermisosDisponibles = useMemo(() => {
        if (!usuarioIndivSeleccionado) {
            return rolPermisos;
        }

        const idUsuario = Number(usuarioIndivSeleccionado);
        const yaAsignadosIds = asignaciones
            .filter((asig) => asig.usuario.id_usuario === idUsuario)
            .map((asig) => asig.rol_permiso.id_rol_permiso);

        return rolPermisos.filter(
            (rp) => !yaAsignadosIds.includes(rp.id_rol_permiso)
        );
    }, [asignaciones, rolPermisos, usuarioIndivSeleccionado]);

    // Filtrar asignaciones mostradas en la tabla
    const asignacionesFiltradas = useMemo(() => {
        return asignaciones.filter((asig) => {
            const coincideUsuario =
                !filtroUsuario ||
                asig.usuario.id_usuario === Number(filtroUsuario);

            const coincideRol =
                !filtroRol ||
                asig.rol_permiso.rol.id_rol === Number(filtroRol);

            return coincideUsuario && coincideRol;
        });
    }, [asignaciones, filtroUsuario, filtroRol]);

    const obtenerMensajeValidacion = (errorPeticion, defecto) => {
        const errores = errorPeticion.data?.errors;
        if (errores) {
            const primerError = Object.values(errores)[0];
            if (Array.isArray(primerError)) {
                return primerError[0];
            }
        }
        return errorPeticion.message || defecto;
    };

    // Manejar asignación completa de Rol
    const manejarAsignarRolCompleto = async (event) => {
        event.preventDefault();

        if (!usuarioRolSeleccionado || !rolCompletoSeleccionado) {
            setError('Selecciona un usuario y un rol.');
            return;
        }

        try {
            setAsignandoRol(true);
            setError('');
            setMensaje('');

            const respuesta = await asignarRolAUsuario(
                usuarioRolSeleccionado,
                rolCompletoSeleccionado
            );

            setMensaje(
                respuesta.message ||
                'Rol y sus permisos asignados al usuario correctamente.'
            );

            setRolCompletoSeleccionado('');
            await cargarDatos();
        } catch (errorPeticion) {
            setError(
                obtenerMensajeValidacion(
                    errorPeticion,
                    'No se pudo asignar el rol al usuario.'
                )
            );
        } finally {
            setAsignandoRol(false);
        }
    };

    // Manejar asignación individual
    const manejarAsignarIndividual = async (event) => {
        event.preventDefault();

        if (!usuarioIndivSeleccionado || !rolPermisoSeleccionado) {
            setError('Selecciona un usuario y un permiso de rol.');
            return;
        }

        try {
            setAsignandoIndiv(true);
            setError('');
            setMensaje('');

            const respuesta = await asignarUsuarioRolPermiso(
                usuarioIndivSeleccionado,
                rolPermisoSeleccionado
            );

            setMensaje(
                respuesta.message ||
                'Permiso asignado al usuario correctamente.'
            );

            setRolPermisoSeleccionado('');
            await cargarDatos();
        } catch (errorPeticion) {
            setError(
                obtenerMensajeValidacion(
                    errorPeticion,
                    'No se pudo asignar el permiso al usuario.'
                )
            );
        } finally {
            setAsignandoIndiv(false);
        }
    };

    // Quitar una asignación individual
    const manejarQuitarAsignacion = async (asig) => {
        const confirmado = window.confirm(
            `¿Deseas quitar el permiso "${asig.rol_permiso.permiso.nombre}" (Rol: ${asig.rol_permiso.rol.nombre}) del usuario "${asig.usuario.nombre}"?`
        );

        if (!confirmado) {
            return;
        }

        try {
            setQuitandoId(asig.id_usuario_rol_permiso);
            setError('');
            setMensaje('');

            const respuesta = await quitarUsuarioRolPermiso(
                asig.id_usuario_rol_permiso
            );

            setMensaje(
                respuesta.message ||
                'Asignación eliminada correctamente.'
            );

            await cargarDatos();
        } catch (errorPeticion) {
            setError(
                errorPeticion.message ||
                'No se pudo eliminar la asignación.'
            );
        } finally {
            setQuitandoId(null);
        }
    };

    // Revocar todos los permisos de un rol a un usuario
    const manejarRevocarRol = async () => {
        if (!filtroUsuario || !filtroRol) {
            setError('Para revocar un rol completo, selecciona un usuario y un rol en los filtros superiores.');
            return;
        }

        const usuarioObj = usuarios.find((u) => u.id_usuario === Number(filtroUsuario));
        const rolObj = roles.find((r) => r.id_rol === Number(filtroRol));

        const confirmado = window.confirm(
            `¿Estás seguro de revocar TODOS los permisos del rol "${rolObj?.nombre}" al usuario "${usuarioObj?.nombre}"?`
        );

        if (!confirmado) {
            return;
        }

        try {
            setRevocandoRol(true);
            setError('');
            setMensaje('');

            const respuesta = await quitarRolAUsuario(filtroUsuario, filtroRol);

            setMensaje(
                respuesta.message ||
                'Permisos del rol revocados correctamente.'
            );

            await cargarDatos();
        } catch (errorPeticion) {
            setError(
                errorPeticion.message ||
                'No se pudieron revocar los permisos del rol.'
            );
        } finally {
            setRevocandoRol(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Asignación de Roles y Permisos
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Administra qué roles y permisos tiene habilitados cada usuario en el sistema.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatos}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
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

            {/* Formularios de Asignación */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Asignación por Rol Completo */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                                1
                            </span>
                            <h2 className="text-lg font-bold text-gray-900">
                                Asignar Rol Completo
                            </h2>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Asigna todos los permisos activos asociados a un rol a un usuario determinado.
                        </p>

                        <form onSubmit={manejarAsignarRolCompleto} className="mt-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="usuario_rol"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Usuario
                                </label>
                                <select
                                    id="usuario_rol"
                                    value={usuarioRolSeleccionado}
                                    onChange={(e) => {
                                        setUsuarioRolSeleccionado(e.target.value);
                                        setError('');
                                        setMensaje('');
                                    }}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                >
                                    <option value="">Seleccionar usuario</option>
                                    {usuarios.map((u) => (
                                        <option key={u.id_usuario} value={u.id_usuario}>
                                            {u.nombre} ({u.nombre_usuario})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="rol_completo"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Rol a Asignar
                                </label>
                                <select
                                    id="rol_completo"
                                    value={rolCompletoSeleccionado}
                                    onChange={(e) => {
                                        setRolCompletoSeleccionado(e.target.value);
                                        setError('');
                                        setMensaje('');
                                    }}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                >
                                    <option value="">Seleccionar rol</option>
                                    {roles.map((r) => (
                                        <option key={r.id_rol} value={r.id_rol}>
                                            {r.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    asignandoRol ||
                                    !usuarioRolSeleccionado ||
                                    !rolCompletoSeleccionado
                                }
                                className="w-full rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                            >
                                {asignandoRol ? 'Asignando Rol...' : 'Asignar Rol Completo'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Asignación Individual de Rol-Permiso */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                                2
                            </span>
                            <h2 className="text-lg font-bold text-gray-900">
                                Asignar Permiso Específico
                            </h2>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Asigna un permiso específico de un rol a un usuario individual.
                        </p>

                        <form onSubmit={manejarAsignarIndividual} className="mt-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="usuario_indiv"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Usuario
                                </label>
                                <select
                                    id="usuario_indiv"
                                    value={usuarioIndivSeleccionado}
                                    onChange={(e) => {
                                        setUsuarioIndivSeleccionado(e.target.value);
                                        setRolPermisoSeleccionado('');
                                        setError('');
                                        setMensaje('');
                                    }}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                >
                                    <option value="">Seleccionar usuario</option>
                                    {usuarios.map((u) => (
                                        <option key={u.id_usuario} value={u.id_usuario}>
                                            {u.nombre} ({u.nombre_usuario})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="rol_permiso"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Permiso de Rol
                                </label>
                                <select
                                    id="rol_permiso"
                                    value={rolPermisoSeleccionado}
                                    onChange={(e) => {
                                        setRolPermisoSeleccionado(e.target.value);
                                        setError('');
                                        setMensaje('');
                                    }}
                                    required
                                    disabled={!usuarioIndivSeleccionado}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {!usuarioIndivSeleccionado
                                            ? 'Primero selecciona un usuario'
                                            : rolPermisosDisponibles.length === 0
                                              ? 'No hay más permisos disponibles'
                                              : 'Seleccionar permiso de rol'}
                                    </option>
                                    {rolPermisosDisponibles.map((rp) => (
                                        <option
                                            key={rp.id_rol_permiso}
                                            value={rp.id_rol_permiso}
                                        >
                                            [{rp.rol.nombre}] {rp.permiso.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    asignandoIndiv ||
                                    !usuarioIndivSeleccionado ||
                                    !rolPermisoSeleccionado
                                }
                                className="w-full rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                            >
                                {asignandoIndiv ? 'Asignando Permiso...' : 'Asignar Permiso Específico'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Filtros y Tabla de Asignaciones Existentes */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50/50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <label htmlFor="filtro_usuario" className="sr-only">
                                    Filtrar por usuario
                                </label>
                                <select
                                    id="filtro_usuario"
                                    value={filtroUsuario}
                                    onChange={(e) => setFiltroUsuario(e.target.value)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                >
                                    <option value="">Todos los usuarios</option>
                                    {usuarios.map((u) => (
                                        <option key={u.id_usuario} value={u.id_usuario}>
                                            {u.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="filtro_rol" className="sr-only">
                                    Filtrar por rol
                                </label>
                                <select
                                    id="filtro_rol"
                                    value={filtroRol}
                                    onChange={(e) => setFiltroRol(e.target.value)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                >
                                    <option value="">Todos los roles</option>
                                    {roles.map((r) => (
                                        <option key={r.id_rol} value={r.id_rol}>
                                            {r.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(filtroUsuario || filtroRol) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFiltroUsuario('');
                                        setFiltroRol('');
                                    }}
                                    className="text-xs font-semibold text-pink-600 hover:text-pink-800"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>

                        {filtroUsuario && filtroRol && (
                            <button
                                type="button"
                                onClick={manejarRevocarRol}
                                disabled={revocandoRol}
                                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                            >
                                {revocandoRol ? 'Revocando...' : 'Revocar Rol Completo del Usuario'}
                            </button>
                        )}
                    </div>
                </div>

                {cargando ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando asignaciones...
                    </div>
                ) : asignacionesFiltradas.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {asignaciones.length === 0
                            ? 'No existen asignaciones de roles y permisos registradas.'
                            : 'No se encontraron asignaciones que coincidan con los filtros seleccionados.'}
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
                                        Usuario
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
                                {asignacionesFiltradas.map((asig) => (
                                    <tr
                                        key={asig.id_usuario_rol_permiso}
                                        className="hover:bg-gray-50 transition"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {asig.id_usuario_rol_permiso}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            {asig.usuario.nombre}
                                            <span className="block text-xs font-normal text-gray-500">
                                                @{asig.usuario.nombre_usuario}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                            {asig.rol_permiso.rol.nombre}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {asig.rol_permiso.permiso.nombre}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {asig.rol_permiso.permiso.descripcion || 'Sin descripción'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {asig.usuario.activo &&
                                            asig.rol_permiso.rol.activo &&
                                            asig.rol_permiso.permiso.activo ? (
                                                <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => manejarQuitarAsignacion(asig)}
                                                disabled={quitandoId === asig.id_usuario_rol_permiso}
                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                                            >
                                                {quitandoId === asig.id_usuario_rol_permiso
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

export default AsignacionesPage;

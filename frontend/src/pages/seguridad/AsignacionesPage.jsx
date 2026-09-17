import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    asignarRolAUsuario,
    listarUsuarioRolPermisos,
    obtenerCatalogosUsuarioRolPermiso,
    quitarRolAUsuario,
} from '../../services/usuarioRolPermisoService';

import {
    crearRol,
} from '../../services/rolService';

const formularioRolInicial = {
    nombre: '',
    descripcion: '',
};

function AsignacionesPage() {
    const [asignaciones, setAsignaciones] =
        useState([]);

    const [usuarios, setUsuarios] =
        useState([]);

    const [roles, setRoles] =
        useState([]);

    const [
        usuarioSeleccionado,
        setUsuarioSeleccionado,
    ] = useState('');

    const [
        rolSeleccionado,
        setRolSeleccionado,
    ] = useState('');

    const [
        filtroUsuario,
        setFiltroUsuario,
    ] = useState('');

    const [
        filtroRol,
        setFiltroRol,
    ] = useState('');

    const [cargando, setCargando] =
        useState(true);

    const [asignando, setAsignando] =
        useState(false);

    const [
        revocandoClave,
        setRevocandoClave,
    ] = useState(null);

    const [error, setError] =
        useState('');

    const [mensaje, setMensaje] =
        useState('');

    /*
     * Crear rol
     */
    const [
        modalRolAbierto,
        setModalRolAbierto,
    ] = useState(false);

    const [
        formularioRol,
        setFormularioRol,
    ] = useState(
        formularioRolInicial
    );

    const [
        guardandoRol,
        setGuardandoRol,
    ] = useState(false);

    const [
        errorRol,
        setErrorRol,
    ] = useState('');

    const cargarDatos =
        useCallback(async () => {
            try {
                setCargando(true);
                setError('');

                const [
                    respuestaAsignaciones,
                    respuestaCatalogos,
                ] = await Promise.all([
                    listarUsuarioRolPermisos(),
                    obtenerCatalogosUsuarioRolPermiso(),
                ]);

                setAsignaciones(
                    respuestaAsignaciones
                        .asignaciones ?? []
                );

                setUsuarios(
                    respuestaCatalogos
                        .usuarios ?? []
                );

                setRoles(
                    respuestaCatalogos
                        .roles ?? []
                );
            } catch (errorPeticion) {
                if (
                    errorPeticion.status === 403
                ) {
                    setError(
                        'No tienes permiso para gestionar las asignaciones.'
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
                            'No se pudieron cargar las asignaciones.'
                    );
                }
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    /*
     * Agrupar las asignaciones reales de
     * usuario_rol_permiso por Usuario + Rol.
     *
     * La pantalla muestra un rol como una sola fila,
     * aunque internamente existan varias relaciones
     * usuario_rol_permiso.
     */
    const rolesAsignados =
        useMemo(() => {
            const mapa = new Map();

            asignaciones.forEach(
                (asignacion) => {
                    const usuario =
                        asignacion.usuario;

                    const rol =
                        asignacion
                            .rol_permiso
                            .rol;

                    const permiso =
                        asignacion
                            .rol_permiso
                            .permiso;

                    const clave =
                        `${usuario.id_usuario}-${rol.id_rol}`;

                    if (!mapa.has(clave)) {
                        mapa.set(
                            clave,
                            {
                                clave,
                                usuario,
                                rol,
                                permisos: [],
                            }
                        );
                    }

                    mapa
                        .get(clave)
                        .permisos
                        .push(permiso);
                }
            );

            return Array.from(
                mapa.values()
            ).sort((a, b) => {
                const usuarioComparacion =
                    a.usuario.nombre.localeCompare(
                        b.usuario.nombre
                    );

                if (
                    usuarioComparacion !== 0
                ) {
                    return usuarioComparacion;
                }

                return a.rol.nombre.localeCompare(
                    b.rol.nombre
                );
            });
        }, [asignaciones]);

    const rolesAsignadosFiltrados =
        useMemo(() => {
            return rolesAsignados.filter(
                (grupo) => {
                    const coincideUsuario =
                        !filtroUsuario ||
                        Number(
                            grupo.usuario
                                .id_usuario
                        ) ===
                            Number(
                                filtroUsuario
                            );

                    const coincideRol =
                        !filtroRol ||
                        Number(
                            grupo.rol.id_rol
                        ) ===
                            Number(
                                filtroRol
                            );

                    return (
                        coincideUsuario &&
                        coincideRol
                    );
                }
            );
        }, [
            rolesAsignados,
            filtroUsuario,
            filtroRol,
        ]);

    const obtenerMensajeError = (
        errorPeticion,
        mensajeDefecto
    ) => {
        const errores =
            errorPeticion.data?.errors;

        if (errores) {
            const primerError =
                Object.values(
                    errores
                )[0];

            if (
                Array.isArray(
                    primerError
                )
            ) {
                return primerError[0];
            }
        }

        return (
            errorPeticion.message ||
            mensajeDefecto
        );
    };

    /*
     * Asignar un rol completo.
     *
     * El backend crea las relaciones
     * usuario_rol_permiso correspondientes
     * a todos los permisos actuales del rol.
     */
    const manejarAsignarRol =
        async (event) => {
            event.preventDefault();

            if (
                !usuarioSeleccionado ||
                !rolSeleccionado
            ) {
                setError(
                    'Selecciona un usuario y un rol.'
                );

                return;
            }

            try {
                setAsignando(true);
                setError('');
                setMensaje('');

                const respuesta =
                    await asignarRolAUsuario(
                        usuarioSeleccionado,
                        rolSeleccionado
                    );

                const nuevos =
                    respuesta
                        .nuevos_permisos_asignados ??
                    0;

                const total =
                    respuesta
                        .total_permisos_rol ??
                    0;

                if (nuevos === 0) {
                    setMensaje(
                        'El usuario ya tenía asignado este rol con sus permisos actuales.'
                    );
                } else {
                    setMensaje(
                        `Rol asignado correctamente. Se habilitaron ${nuevos} de ${total} permiso(s).`
                    );
                }

                setRolSeleccionado('');

                await cargarDatos();
            } catch (errorPeticion) {
                setError(
                    obtenerMensajeError(
                        errorPeticion,
                        'No se pudo asignar el rol al usuario.'
                    )
                );
            } finally {
                setAsignando(false);
            }
        };

    /*
     * Quitar el rol completo.
     */
    const manejarQuitarRol =
        async (grupo) => {
            const confirmado =
                window.confirm(
                    `¿Deseas quitar el rol "${grupo.rol.nombre}" al usuario "${grupo.usuario.nombre}"?`
                );

            if (!confirmado) {
                return;
            }

            try {
                setRevocandoClave(
                    grupo.clave
                );

                setError('');
                setMensaje('');

                const respuesta =
                    await quitarRolAUsuario(
                        grupo.usuario
                            .id_usuario,
                        grupo.rol.id_rol
                    );

                setMensaje(
                    respuesta.message ||
                        'Rol quitado del usuario correctamente.'
                );

                await cargarDatos();
            } catch (errorPeticion) {
                setError(
                    obtenerMensajeError(
                        errorPeticion,
                        'No se pudo quitar el rol del usuario.'
                    )
                );
            } finally {
                setRevocandoClave(null);
            }
        };

    /*
     * Modal de creación de rol.
     */
    const abrirModalRol = () => {
        setFormularioRol(
            formularioRolInicial
        );

        setErrorRol('');
        setModalRolAbierto(true);
    };

    const cerrarModalRol = () => {
        if (guardandoRol) {
            return;
        }

        setModalRolAbierto(false);
        setFormularioRol(
            formularioRolInicial
        );
        setErrorRol('');
    };

    const manejarCambioRol = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setFormularioRol(
            (actual) => ({
                ...actual,
                [name]: value,
            })
        );

        setErrorRol('');
    };

    const manejarCrearRol =
        async (event) => {
            event.preventDefault();

            const nombre =
                formularioRol.nombre.trim();

            const descripcion =
                formularioRol
                    .descripcion
                    .trim();

            if (!nombre) {
                setErrorRol(
                    'Ingresa el nombre del rol.'
                );

                return;
            }

            try {
                setGuardandoRol(true);
                setErrorRol('');
                setError('');
                setMensaje('');

                const respuesta =
                    await crearRol({
                        nombre,
                        descripcion:
                            descripcion ||
                            null,
                    });

                /*
                 * Volvemos a solicitar los catálogos para
                 * que el nuevo rol aparezca inmediatamente.
                 */
                const catalogos =
                    await obtenerCatalogosUsuarioRolPermiso();

                const rolesActualizados =
                    catalogos.roles ?? [];

                setUsuarios(
                    catalogos.usuarios ??
                        []
                );

                setRoles(
                    rolesActualizados
                );

                /*
                 * Si el backend devuelve el rol creado,
                 * utilizamos directamente su ID.
                 *
                 * Como respaldo, lo buscamos por nombre.
                 */
                const idRolCreado =
                    respuesta?.rol
                        ?.id_rol;

                if (idRolCreado) {
                    setRolSeleccionado(
                        String(
                            idRolCreado
                        )
                    );
                } else {
                    const rolCreado =
                        rolesActualizados.find(
                            (rol) =>
                                rol.nombre
                                    .trim()
                                    .toLowerCase() ===
                                nombre.toLowerCase()
                        );

                    if (rolCreado) {
                        setRolSeleccionado(
                            String(
                                rolCreado.id_rol
                            )
                        );
                    }
                }

                setModalRolAbierto(
                    false
                );

                setFormularioRol(
                    formularioRolInicial
                );

                setMensaje(
                    'Rol creado correctamente. Ahora configura sus permisos desde Rol-Permiso antes de asignarlo a un usuario.'
                );
            } catch (errorPeticion) {
                setErrorRol(
                    obtenerMensajeError(
                        errorPeticion,
                        'No se pudo crear el rol.'
                    )
                );
            } finally {
                setGuardandoRol(false);
            }
        };

    return (
        <section className="space-y-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Asignaciones de Roles
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        Asigna roles a los usuarios. Los permisos de cada rol se administran desde Rol-Permiso.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        cargarDatos
                    }
                    disabled={cargando}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {cargando
                        ? 'Actualizando...'
                        : 'Actualizar'}
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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Asignar rol a usuario
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Selecciona el usuario y el rol. El sistema habilitará automáticamente los permisos configurados para ese rol.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            abrirModalRol
                        }
                        className="shrink-0 rounded-lg border border-pink-300 px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
                    >
                        + Crear nuevo rol
                    </button>
                </div>

                <form
                    onSubmit={
                        manejarAsignarRol
                    }
                    className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
                >

                    <div>
                        <label
                            htmlFor="usuario_asignacion"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Usuario
                        </label>

                        <select
                            id="usuario_asignacion"
                            value={
                                usuarioSeleccionado
                            }
                            onChange={(event) => {
                                setUsuarioSeleccionado(
                                    event.target.value
                                );

                                setError('');
                                setMensaje('');
                            }}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        >
                            <option value="">
                                Seleccionar usuario
                            </option>

                            {usuarios.map(
                                (usuario) => (
                                    <option
                                        key={
                                            usuario.id_usuario
                                        }
                                        value={
                                            usuario.id_usuario
                                        }
                                    >
                                        {
                                            usuario.nombre
                                        }{' '}
                                        (@
                                        {
                                            usuario.nombre_usuario
                                        }
                                        )
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between">

                            <label
                                htmlFor="rol_asignacion"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Rol
                            </label>

                            <span className="text-xs text-gray-400">
                                Permisos definidos en Rol-Permiso
                            </span>
                        </div>

                        <select
                            id="rol_asignacion"
                            value={
                                rolSeleccionado
                            }
                            onChange={(event) => {
                                setRolSeleccionado(
                                    event.target.value
                                );

                                setError('');
                                setMensaje('');
                            }}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        >
                            <option value="">
                                Seleccionar rol
                            </option>

                            {roles.map(
                                (rol) => (
                                    <option
                                        key={
                                            rol.id_rol
                                        }
                                        value={
                                            rol.id_rol
                                        }
                                    >
                                        {
                                            rol.nombre
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={
                                asignando ||
                                !usuarioSeleccionado ||
                                !rolSeleccionado
                            }
                            className="w-full rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                        >
                            {asignando
                                ? 'Asignando...'
                                : 'Asignar Rol'}
                        </button>
                    </div>
                </form>

                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    Para cambiar las funciones disponibles para un rol, utiliza el módulo Rol-Permiso. No es necesario asignar permisos individualmente a cada usuario.
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 bg-gray-50 p-4">

                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

                        <div>
                            <h2 className="font-bold text-gray-900">
                                Roles asignados
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Consulta y administra los roles actualmente asignados a los usuarios.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">

                            <div>
                                <label
                                    htmlFor="filtro_usuario"
                                    className="mb-1 block text-xs font-medium text-gray-600"
                                >
                                    Usuario
                                </label>

                                <select
                                    id="filtro_usuario"
                                    value={
                                        filtroUsuario
                                    }
                                    onChange={(event) =>
                                        setFiltroUsuario(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">
                                        Todos
                                    </option>

                                    {usuarios.map(
                                        (usuario) => (
                                            <option
                                                key={
                                                    usuario.id_usuario
                                                }
                                                value={
                                                    usuario.id_usuario
                                                }
                                            >
                                                {
                                                    usuario.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="filtro_rol"
                                    className="mb-1 block text-xs font-medium text-gray-600"
                                >
                                    Rol
                                </label>

                                <select
                                    id="filtro_rol"
                                    value={
                                        filtroRol
                                    }
                                    onChange={(event) =>
                                        setFiltroRol(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">
                                        Todos
                                    </option>

                                    {roles.map(
                                        (rol) => (
                                            <option
                                                key={
                                                    rol.id_rol
                                                }
                                                value={
                                                    rol.id_rol
                                                }
                                            >
                                                {
                                                    rol.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {(filtroUsuario ||
                                filtroRol) && (
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFiltroUsuario(
                                                ''
                                            );

                                            setFiltroRol(
                                                ''
                                            );
                                        }}
                                        className="px-2 py-2 text-xs font-semibold text-pink-600 hover:text-pink-800"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando asignaciones...
                    </div>
                ) : rolesAsignadosFiltrados.length ===
                  0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No existen roles asignados que coincidan con los filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto">

                        <table className="min-w-full divide-y divide-gray-200">

                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Usuario
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Rol
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Permisos
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Estado
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Acción
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 bg-white">

                                {rolesAsignadosFiltrados.map(
                                    (grupo) => (
                                        <tr
                                            key={
                                                grupo.clave
                                            }
                                            className="align-top hover:bg-gray-50"
                                        >

                                            <td className="px-6 py-4">

                                                <p className="text-sm font-semibold text-gray-900">
                                                    {
                                                        grupo
                                                            .usuario
                                                            .nombre
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    @
                                                    {
                                                        grupo
                                                            .usuario
                                                            .nombre_usuario
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">

                                                <span className="inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                                                    {
                                                        grupo
                                                            .rol
                                                            .nombre
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">

                                                <p className="text-sm font-semibold text-gray-800">
                                                    {
                                                        grupo
                                                            .permisos
                                                            .length
                                                    }{' '}
                                                    permiso(s)
                                                </p>

                                                <details className="mt-2">

                                                    <summary className="cursor-pointer text-xs font-semibold text-pink-600 hover:text-pink-800">
                                                        Ver permisos
                                                    </summary>

                                                    <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3">

                                                        {grupo.permisos.map(
                                                            (
                                                                permiso
                                                            ) => (
                                                                <p
                                                                    key={
                                                                        permiso.id_permiso
                                                                    }
                                                                    className="text-xs text-gray-600"
                                                                >
                                                                    •{' '}
                                                                    {
                                                                        permiso.nombre
                                                                    }
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                </details>
                                            </td>

                                            <td className="px-6 py-4">

                                                {grupo.usuario
                                                    .activo &&
                                                grupo.rol
                                                    .activo ? (
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
                                                    onClick={() =>
                                                        manejarQuitarRol(
                                                            grupo
                                                        )
                                                    }
                                                    disabled={
                                                        revocandoClave ===
                                                        grupo.clave
                                                    }
                                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {revocandoClave ===
                                                    grupo.clave
                                                        ? 'Quitando...'
                                                        : 'Quitar Rol'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalRolAbierto && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">

                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

                        <div className="border-b border-gray-200 px-6 py-4">

                            <h2 className="text-xl font-bold text-gray-900">
                                Crear nuevo rol
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Crea un nuevo tipo de acceso para los usuarios del sistema.
                            </p>
                        </div>

                        <form
                            onSubmit={
                                manejarCrearRol
                            }
                            className="space-y-5 p-6"
                        >

                            {errorRol && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {errorRol}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="nombre_rol"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Nombre del rol
                                </label>

                                <input
                                    id="nombre_rol"
                                    name="nombre"
                                    type="text"
                                    value={
                                        formularioRol.nombre
                                    }
                                    onChange={
                                        manejarCambioRol
                                    }
                                    maxLength={60}
                                    required
                                    placeholder="Ej. Supervisor"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="descripcion_rol"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Descripción
                                </label>

                                <textarea
                                    id="descripcion_rol"
                                    name="descripcion"
                                    value={
                                        formularioRol.descripcion
                                    }
                                    onChange={
                                        manejarCambioRol
                                    }
                                    rows={4}
                                    maxLength={255}
                                    placeholder="Describe brevemente la función de este rol..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />

                                <p className="mt-1 text-xs text-gray-400">
                                    La configuración de permisos se realiza posteriormente desde Rol-Permiso.
                                </p>
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                Un rol nuevo no tendrá acceso a ninguna función hasta que se le asignen permisos desde Rol-Permiso.
                            </div>

                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                                <button
                                    type="button"
                                    onClick={
                                        cerrarModalRol
                                    }
                                    disabled={
                                        guardandoRol
                                    }
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        guardandoRol ||
                                        !formularioRol
                                            .nombre
                                            .trim()
                                    }
                                    className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {guardandoRol
                                        ? 'Creando...'
                                        : 'Crear Rol'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default AsignacionesPage;
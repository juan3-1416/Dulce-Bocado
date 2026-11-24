import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    actualizarEstadoRol,
    actualizarRol,
    crearRol,
    listarRoles,
    obtenerRol,
} from '../../services/rolService';

const formularioInicial = {
    nombre: '',
    descripcion: '',
};

function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);
        const [rolEditando, setRolEditando] =
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

    const cargarRoles = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await listarRoles();

            setRoles(respuesta.roles ?? []);
        } catch (errorPeticion) {
            if (errorPeticion.status === 403) {
                setError(
                    'No tienes permiso para gestionar roles.'
                );
            } else if (errorPeticion.status === 401) {
                setError(
                    'Tu sesión ha expirado. Inicia sesión nuevamente.'
                );
            } else {
                setError(
                    errorPeticion.message ||
                    'No se pudieron cargar los roles.'
                );
            }
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarRoles();
    }, [cargarRoles]);

    const manejarCambio = (event) => {
        const { name, value } = event.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value,
        }));
    };

const abrirNuevoRol = () => {
    setRolEditando(null);
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

        const respuesta = await obtenerRol(id);
        const rol = respuesta.rol;

        setRolEditando(rol);

        setFormulario({
            nombre: rol.nombre ?? '',
            descripcion: rol.descripcion ?? '',
        });

        setMostrarFormulario(true);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    } catch (errorPeticion) {
        setError(
            errorPeticion.message ||
            'No se pudo cargar el rol.'
        );
    } finally {
        setCargandoEdicion(false);
    }
};

const cerrarFormulario = () => {
    setRolEditando(null);
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
            'No se pudo registrar el rol.'
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

        if (rolEditando) {
            respuesta = await actualizarRol(
                rolEditando.id_rol,
                datos
            );
        } else {
            respuesta = await crearRol(datos);
        }

        setMensaje(
            respuesta.message ||
            (
                rolEditando
                    ? 'Rol actualizado correctamente.'
                    : 'Rol registrado correctamente.'
            )
        );

        cerrarFormulario();
        await cargarRoles();
    } catch (errorPeticion) {
        setErrorFormulario(
            obtenerMensajeValidacion(errorPeticion)
        );
    } finally {
        setGuardando(false);
    }
};
const manejarCambioEstado = async (rol) => {
    const nuevoEstado = !rol.activo;

    const accion = nuevoEstado
        ? 'activar'
        : 'desactivar';

    const confirmado = window.confirm(
        `¿Seguro que deseas ${accion} el rol "${rol.nombre}"?`
    );

    if (!confirmado) {
        return;
    }

    try {
        setCambiandoEstadoId(rol.id_rol);
        setError('');
        setMensaje('');

        const respuesta =
            await actualizarEstadoRol(
                rol.id_rol,
                nuevoEstado
            );

        setMensaje(
            respuesta.message ||
            (
                nuevoEstado
                    ? 'Rol activado correctamente.'
                    : 'Rol desactivado correctamente.'
            )
        );

        await cargarRoles();
    } catch (errorPeticion) {
        setError(
            errorPeticion.message ||
            'No se pudo modificar el estado del rol.'
        );
    } finally {
        setCambiandoEstadoId(null);
    }
};
return (
    <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Gestión de Roles
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Administra los roles disponibles en Dulce Bocado.
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={cargarRoles}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Actualizar
                </button>

                <button
                    type="button"
                    onClick={abrirNuevoRol}
                    className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                >
                    Nuevo Rol
                </button>
            </div>
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

        {mostrarFormulario && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                    {rolEditando
                        ? 'Editar Rol'
                        : 'Registrar Rol'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    {rolEditando
                        ? 'Modifica los datos del rol seleccionado.'
                        : 'Registra un nuevo rol. Los permisos se asignarán posteriormente.'}
                </p>

                {errorFormulario && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Nombre del rol
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            required
                            maxLength={60}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="descripcion"
                            className="mb-1 block text-sm font-medium text-gray-700"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={cerrarFormulario}
                            disabled={guardando}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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
                                : rolEditando
                                  ? 'Guardar Cambios'
                                  : 'Registrar Rol'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {cargando ? (
                <div className="p-8 text-center text-gray-500">
                    Cargando roles...
                </div>
            ) : roles.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    No hay roles registrados.
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
                                    Nombre
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
                            {roles.map((rol) => (
                                <tr
                                    key={rol.id_rol}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {rol.id_rol}
                                    </td>

                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {rol.nombre}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {rol.descripcion ||
                                            'Sin descripción'}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span
                                            className={
                                                rol.activo
                                                    ? 'inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
                                                    : 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700'
                                            }
                                        >
                                            {rol.activo
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </td>

<td className="px-6 py-4">
    <div className="flex flex-wrap gap-2">
        <button
            type="button"
            onClick={() =>
                abrirEdicion(rol.id_rol)
            }
            disabled={
                cargandoEdicion ||
                cambiandoEstadoId === rol.id_rol
            }
            className="rounded-lg border border-pink-200 px-3 py-1.5 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"
        >
            Editar
        </button>

        <button
            type="button"
            onClick={() =>
                manejarCambioEstado(rol)
            }
            disabled={
                cambiandoEstadoId === rol.id_rol ||
                rol.nombre === 'Administrador'
            }
            title={
                rol.nombre === 'Administrador'
                    ? 'El rol Administrador no debe desactivarse.'
                    : ''
            }
            className={
                rol.activo
                    ? 'rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'rounded-lg border border-green-200 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50'
            }
        >
            {cambiandoEstadoId === rol.id_rol
                ? 'Procesando...'
                : rol.activo
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
export default RolesPage;
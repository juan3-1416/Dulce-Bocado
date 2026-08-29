import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    actualizarEstadoUsuario,
    actualizarUsuario,
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
} from '../../services/usuarioService';

const formularioInicial = {
    nombre: '',
    nombre_usuario: '',
    correo_electronico: '',
    contrasena: '',
    contrasena_confirmation: '',
};

function UsuariosPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const [usuarioEditando, setUsuarioEditando] =
        useState(null);

    const [formulario, setFormulario] =
        useState(formularioInicial);

    const [guardando, setGuardando] = useState(false);
    const [cargandoEdicion, setCargandoEdicion] =
        useState(false);

        const [cambiandoEstadoId, setCambiandoEstadoId] =
    useState(null);

    const [errorFormulario, setErrorFormulario] =
        useState('');

    const cargarUsuarios = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await listarUsuarios();

            setUsuarios(respuesta.usuarios ?? []);
        } catch (errorPeticion) {
            if (errorPeticion.status === 403) {
                setError(
                    'No tienes permiso para gestionar usuarios.'
                );
            } else if (errorPeticion.status === 401) {
                setError(
                    'Tu sesión ha expirado. Inicia sesión nuevamente.'
                );
            } else {
                setError(
                    errorPeticion.message ||
                    'No se pudieron cargar los usuarios.'
                );
            }
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarUsuarios();
    }, [cargarUsuarios]);

    const manejarCambio = (event) => {
        const { name, value } = event.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value,
        }));
    };

    const abrirNuevoUsuario = () => {
        setUsuarioEditando(null);
        setFormulario(formularioInicial);
        setErrorFormulario('');
        setMensaje('');
        setMostrarFormulario(true);
    };

    const abrirEdicion = async (id) => {
        try {
            setCargandoEdicion(true);
            setErrorFormulario('');
            setMensaje('');

            const respuesta = await obtenerUsuario(id);
            const usuario = respuesta.usuario;

            setUsuarioEditando(usuario);

            setFormulario({
                nombre: usuario.nombre ?? '',
                nombre_usuario:
                    usuario.nombre_usuario ?? '',
                correo_electronico:
                    usuario.correo_electronico ?? '',
                contrasena: '',
                contrasena_confirmation: '',
            });

            setMostrarFormulario(true);

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        } catch (errorPeticion) {
            setError(
                errorPeticion.message ||
                'No se pudo cargar el usuario.'
            );
        } finally {
            setCargandoEdicion(false);
        }
    };

    const cerrarFormulario = () => {
        setUsuarioEditando(null);
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
            'No se pudo procesar el usuario.'
        );
    };

    const manejarGuardado = async (event) => {
        event.preventDefault();

        try {
            setGuardando(true);
            setErrorFormulario('');
            setMensaje('');

            if (usuarioEditando) {
                const datosActualizar = {
                    nombre: formulario.nombre,
                    nombre_usuario:
                        formulario.nombre_usuario,
                    correo_electronico:
                        formulario.correo_electronico,
                };

                if (formulario.contrasena) {
                    datosActualizar.contrasena =
                        formulario.contrasena;

                    datosActualizar.contrasena_confirmation =
                        formulario.contrasena_confirmation;
                }

                const respuesta =
                    await actualizarUsuario(
                        usuarioEditando.id_usuario,
                        datosActualizar
                    );

                setMensaje(
                    respuesta.message ||
                    'Usuario actualizado correctamente.'
                );
            } else {
                const respuesta =
                    await crearUsuario(formulario);

                setMensaje(
                    respuesta.message ||
                    'Usuario registrado correctamente.'
                );
            }

            cerrarFormulario();
            await cargarUsuarios();
        } catch (errorPeticion) {
            setErrorFormulario(
                obtenerMensajeValidacion(errorPeticion)
            );
        } finally {
            setGuardando(false);
        }
    };
    const manejarCambioEstado = async (usuario) => {
    const nuevoEstado = !usuario.activo;

    const accion = nuevoEstado
        ? 'activar'
        : 'desactivar';

    const confirmado = window.confirm(
        `¿Seguro que deseas ${accion} al usuario "${usuario.nombre}"?`
    );

    if (!confirmado) {
        return;
    }

    try {
        setCambiandoEstadoId(usuario.id_usuario);
        setError('');
        setMensaje('');

        const respuesta =
            await actualizarEstadoUsuario(
                usuario.id_usuario,
                nuevoEstado
            );

        setMensaje(
            respuesta.message ||
            (
                nuevoEstado
                    ? 'Usuario activado correctamente.'
                    : 'Usuario desactivado correctamente.'
            )
        );

        await cargarUsuarios();
    } catch (errorPeticion) {
        setError(
            errorPeticion.message ||
            'No se pudo modificar el estado del usuario.'
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
                        Gestión de Usuarios
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        Administra los usuarios registrados en
                        Dulce Bocado.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={cargarUsuarios}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Actualizar
                    </button>

                    <button
                        type="button"
                        onClick={abrirNuevoUsuario}
                        className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                    >
                        Nuevo Usuario
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
                        {usuarioEditando
                            ? 'Editar Usuario'
                            : 'Registrar Usuario'}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {usuarioEditando
                            ? 'Modifica los datos del usuario. Deja la contraseña vacía si no deseas cambiarla.'
                            : 'Complete los datos del nuevo usuario. Los roles y permisos se asignarán posteriormente.'}
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
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="nombre"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Nombre completo
                                </label>

                                <input
                                    id="nombre"
                                    name="nombre"
                                    value={formulario.nombre}
                                    onChange={manejarCambio}
                                    required
                                    maxLength={120}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="nombre_usuario"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Nombre de usuario
                                </label>

                                <input
                                    id="nombre_usuario"
                                    name="nombre_usuario"
                                    value={
                                        formulario.nombre_usuario
                                    }
                                    onChange={manejarCambio}
                                    required
                                    maxLength={80}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="correo_electronico"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Correo electrónico
                            </label>

                            <input
                                id="correo_electronico"
                                name="correo_electronico"
                                type="email"
                                value={
                                    formulario.correo_electronico
                                }
                                onChange={manejarCambio}
                                required
                                maxLength={150}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="contrasena"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    {usuarioEditando
                                        ? 'Nueva contraseña'
                                        : 'Contraseña'}
                                </label>

                                <input
                                    id="contrasena"
                                    name="contrasena"
                                    type="password"
                                    value={
                                        formulario.contrasena
                                    }
                                    onChange={manejarCambio}
                                    required={!usuarioEditando}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="contrasena_confirmation"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Confirmar contraseña
                                </label>

                                <input
                                    id="contrasena_confirmation"
                                    name="contrasena_confirmation"
                                    type="password"
                                    value={
                                        formulario.contrasena_confirmation
                                    }
                                    onChange={manejarCambio}
                                    required={
                                        !usuarioEditando ||
                                        Boolean(
                                            formulario.contrasena
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            La contraseña debe tener mínimo 8
                            caracteres, mayúscula, minúscula,
                            número y símbolo.
                        </p>

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
                                    : usuarioEditando
                                      ? 'Guardar Cambios'
                                      : 'Registrar Usuario'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {cargando ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando usuarios...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        ID
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Nombre
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Usuario
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Correo
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Rol
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {usuarios.map((usuario) => (
                                    <tr
                                        key={
                                            usuario.id_usuario
                                        }
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-5 py-4 text-sm text-gray-500">
                                            {
                                                usuario.id_usuario
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                            {usuario.nombre}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {
                                                usuario.nombre_usuario
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {
                                                usuario.correo_electronico
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {usuario.roles?.length
                                                ? usuario.roles.join(
                                                    ', '
                                                )
                                                : 'Sin rol asignado'}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={
                                                    usuario.activo
                                                        ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
                                                        : 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700'
                                                }
                                            >
                                                {usuario.activo
                                                    ? 'Activo'
                                                    : 'Inactivo'}
                                            </span>
                                        </td>

<td className="px-5 py-4">
    <div className="flex flex-wrap gap-2">
        <button
            type="button"
            onClick={() =>
                abrirEdicion(
                    usuario.id_usuario
                )
            }
            disabled={
                cargandoEdicion ||
                cambiandoEstadoId ===
                    usuario.id_usuario
            }
            className="rounded-lg border border-pink-200 px-3 py-1.5 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"
        >
            Editar
        </button>

        <button
            type="button"
            onClick={() =>
                manejarCambioEstado(usuario)
            }
            disabled={
                cambiandoEstadoId ===
                usuario.id_usuario
            }
            className={
                usuario.activo
                    ? 'rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
                    : 'rounded-lg border border-green-200 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50'
            }
        >
            {cambiandoEstadoId ===
            usuario.id_usuario
                ? 'Procesando...'
                : usuario.activo
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

export default UsuariosPage;
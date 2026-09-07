import { useState, useEffect, useCallback } from 'react';
import {
    listarPresentaciones,
    crearPresentacion,
    cambiarEstadoPresentacion,
    asignarPresentacionProducto,
    actualizarPrecioPresentacionProducto,
    desvincularPresentacionProducto
} from '../../services/presentacionService.js';

function PresentacionesModal({ isOpen, onClose, producto }) {
    const [presentaciones, setPresentaciones] = useState([]);
    const [catalogoGlobal, setCatalogoGlobal] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Modo:
    // "vincular" = elegir una presentación existente.
    // "nueva" = crear una presentación y vincularla.
    const [modo, setModo] = useState('vincular');

    // Guarda el id_presentacion que está siendo editado.
    const [editandoId, setEditandoId] = useState(null);

    const [formulario, setFormulario] = useState({
        id_presentacion: '',
        nombre: '',
        precio: '',
        descripcion: '',
        permite_personalizacion: false
    });

    const [guardando, setGuardando] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Utilidades
    |--------------------------------------------------------------------------
    */

    const formularioVacio = () => ({
        id_presentacion: '',
        nombre: '',
        precio: '',
        descripcion: '',
        permite_personalizacion: false
    });

    const normalizarBooleano = (valor) => {
        return (
            valor === true ||
            valor === 1 ||
            valor === '1'
        );
    };

    const obtenerProductoRelacionado = (pres) => {
        return pres?.productos?.find(
            (prod) =>
                prod.id_producto ===
                producto?.id_producto
        );
    };

    const obtenerPivot = (pres) => {
        if (pres?.pivot) {
            return pres.pivot;
        }

        const productoRelacionado =
            obtenerProductoRelacionado(pres);

        if (productoRelacionado?.pivot) {
            return productoRelacionado.pivot;
        }

        if (pres?.productos?.[0]?.pivot) {
            return pres.productos[0].pivot;
        }

        return null;
    };

    const obtenerPrecio = (pres) => {
        const pivot = obtenerPivot(pres);

        const precio = pivot?.precio;

        if (
            precio === undefined ||
            precio === null ||
            precio === ''
        ) {
            return 0;
        }

        const numero = parseFloat(precio);

        return Number.isNaN(numero)
            ? 0
            : numero;
    };

    const permitePersonalizacion = (pres) => {
        const pivot = obtenerPivot(pres);

        return normalizarBooleano(
            pivot?.permite_personalizacion
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Cargar datos
    |--------------------------------------------------------------------------
    */

    const cargarDatos = useCallback(async () => {
        if (!producto) {
            return;
        }

        try {
            setCargando(true);
            setError('');

            // Presentaciones vinculadas al producto actual.
            const respProducto =
                await listarPresentaciones({
                    id_producto:
                        producto.id_producto
                });

            setPresentaciones(
                respProducto.presentaciones ?? []
            );

            // Catálogo global de presentaciones activas.
            const respCatalogo =
                await listarPresentaciones({
                    estado: true
                });

            setCatalogoGlobal(
                respCatalogo.presentaciones ?? []
            );
        } catch (err) {
            setError(
                err.message ||
                'Error al cargar presentaciones.'
            );
        } finally {
            setCargando(false);
        }
    }, [producto]);

    useEffect(() => {
        if (isOpen && producto) {
            cargarDatos();

            setEditandoId(null);
            setModo('vincular');
            setFormulario(formularioVacio());

            setError('');
            setMensaje('');
        }
    }, [
        isOpen,
        producto,
        cargarDatos
    ]);

    /*
    |--------------------------------------------------------------------------
    | Cambios del formulario
    |--------------------------------------------------------------------------
    */

    const manejarCambio = (e) => {
        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setFormulario((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Guardar
    |--------------------------------------------------------------------------
    */

    const manejarGuardado = async (e) => {
        e.preventDefault();

        try {
            setGuardando(true);
            setError('');
            setMensaje('');

            const precioNum =
                parseFloat(formulario.precio);

            if (
                Number.isNaN(precioNum) ||
                precioNum <= 0
            ) {
                setError(
                    'El precio debe ser un número mayor a 0.'
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Editar configuración de una presentación vinculada
            |--------------------------------------------------------------------------
            */

            if (editandoId) {
                await actualizarPrecioPresentacionProducto(
                    producto.id_producto,
                    editandoId,
                    {
                        precio: precioNum,
                        permite_personalizacion:
                            formulario
                                .permite_personalizacion
                    }
                );

                setMensaje(
                    'Configuración de la presentación actualizada con éxito.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Vincular presentación existente
            |--------------------------------------------------------------------------
            */

            else if (modo === 'vincular') {
                if (!formulario.id_presentacion) {
                    setError(
                        'Seleccione una presentación del catálogo.'
                    );

                    return;
                }

                await asignarPresentacionProducto(
                    producto.id_producto,
                    {
                        id_presentacion:
                            parseInt(
                                formulario
                                    .id_presentacion,
                                10
                            ),

                        precio:
                            precioNum,

                        permite_personalizacion:
                            formulario
                                .permite_personalizacion
                    }
                );

                setMensaje(
                    'Presentación vinculada al producto con éxito.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Crear nueva presentación y vincular
            |--------------------------------------------------------------------------
            */

            else {
                if (!formulario.nombre.trim()) {
                    setError(
                        'Ingrese el nombre de la nueva presentación.'
                    );

                    return;
                }

                const respNueva =
                    await crearPresentacion({
                        nombre:
                            formulario
                                .nombre
                                .trim(),

                        descripcion:
                            formulario.descripcion
                                ? formulario
                                    .descripcion
                                    .trim()
                                : null
                    });

                const nuevaId =
                    respNueva
                        .presentacion
                        ?.id_presentacion;

                if (!nuevaId) {
                    throw new Error(
                        'No se pudo obtener el ID de la nueva presentación.'
                    );
                }

                await asignarPresentacionProducto(
                    producto.id_producto,
                    {
                        id_presentacion:
                            nuevaId,

                        precio:
                            precioNum,

                        permite_personalizacion:
                            formulario
                                .permite_personalizacion
                    }
                );

                setMensaje(
                    'Nueva presentación creada y vinculada al producto con éxito.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Limpiar y recargar
            |--------------------------------------------------------------------------
            */

            setFormulario(
                formularioVacio()
            );

            setEditandoId(null);
            setModo('vincular');

            await cargarDatos();
        } catch (err) {
            const errores =
                err.data?.errors;

            if (errores) {
                const primerError =
                    Object.values(
                        errores
                    )?.[0]?.[0];

                setError(
                    primerError ||
                    'Error de validación.'
                );
            } else {
                setError(
                    err.message ||
                    'Error al guardar presentación.'
                );
            }
        } finally {
            setGuardando(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Editar
    |--------------------------------------------------------------------------
    */

    const iniciarEdicion = (pres) => {
        const pivot =
            obtenerPivot(pres);

        setEditandoId(
            pres.id_presentacion
        );

        setFormulario({
            id_presentacion:
                pres.id_presentacion,

            nombre:
                pres.nombre || '',

            precio:
                pivot?.precio ?? '',

            descripcion:
                pres.descripcion || '',

            permite_personalizacion:
                normalizarBooleano(
                    pivot
                        ?.permite_personalizacion
                )
        });

        setError('');
        setMensaje('');
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setFormulario(
            formularioVacio()
        );

        setError('');
        setMensaje('');
    };

    /*
    |--------------------------------------------------------------------------
    | Desvincular
    |--------------------------------------------------------------------------
    */

    const desvincular = async (pres) => {
        const confirmar =
            window.confirm(
                `¿Deseas desvincular la presentación "${pres.nombre}" de este producto? La presentación seguirá existiendo en el catálogo general.`
            );

        if (!confirmar) {
            return;
        }

        try {
            setCargando(true);
            setError('');
            setMensaje('');

            await desvincularPresentacionProducto(
                producto.id_producto,
                pres.id_presentacion
            );

            setMensaje(
                'Presentación desvinculada del producto con éxito.'
            );

            await cargarDatos();
        } catch (err) {
            setError(
                err.message ||
                'Error al desvincular la presentación.'
            );
        } finally {
            setCargando(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Activar / desactivar presentación del catálogo
    |--------------------------------------------------------------------------
    */

    const cambiarEstado = async (pres) => {
        try {
            setError('');
            setMensaje('');

            await cambiarEstadoPresentacion(
                pres.id_presentacion,
                !pres.estado
            );

            await cargarDatos();
        } catch (err) {
            setError(
                err.message ||
                'Error al cambiar estado.'
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | No renderizar
    |--------------------------------------------------------------------------
    */

    if (!isOpen || !producto) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Presentaciones disponibles
    |--------------------------------------------------------------------------
    */

    const idsVinculados =
        new Set(
            presentaciones.map(
                (p) => p.id_presentacion
            )
        );

    const presentacionesDisponiblesParaVincular =
        catalogoGlobal.filter(
            (p) =>
                !idsVinculados.has(
                    p.id_presentacion
                )
        );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl">

                {/* Encabezado */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Presentaciones y Precios
                        </h2>

                        <p className="text-sm text-gray-500">
                            Producto:{' '}
                            <span className="font-semibold text-gray-700">
                                {producto.nombre}
                            </span>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto p-6">

                    {/* Errores */}
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Mensajes */}
                    {mensaje && (
                        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            {mensaje}
                        </div>
                    )}

                    {/* Formulario */}
                    <form
                        onSubmit={manejarGuardado}
                        className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5"
                    >
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">
                                {editandoId
                                    ? `Editar configuración de: ${formulario.nombre}`
                                    : 'Añadir Presentación al Producto'}
                            </h3>

                            {!editandoId && (
                                <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs font-medium">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModo(
                                                'vincular'
                                            );

                                            setFormulario(
                                                formularioVacio()
                                            );

                                            setError('');
                                            setMensaje('');
                                        }}
                                        className={`rounded-md px-3 py-1.5 transition ${
                                            modo ===
                                            'vincular'
                                                ? 'bg-pink-600 text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Elegir del Catálogo
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModo(
                                                'nueva'
                                            );

                                            setFormulario(
                                                formularioVacio()
                                            );

                                            setError('');
                                            setMensaje('');
                                        }}
                                        className={`rounded-md px-3 py-1.5 transition ${
                                            modo ===
                                            'nueva'
                                                ? 'bg-pink-600 text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        + Crear Nueva Presentación
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">

                            {/* Presentación */}
                            {editandoId ? (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Presentación
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            formulario.nombre
                                        }
                                        disabled
                                        className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                                    />
                                </div>
                            ) : modo === 'vincular' ? (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Seleccionar Presentación
                                    </label>

                                    <select
                                        name="id_presentacion"
                                        value={
                                            formulario
                                                .id_presentacion
                                        }
                                        onChange={
                                            manejarCambio
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    >
                                        <option value="">
                                            Seleccione una presentación...
                                        </option>

                                        {presentacionesDisponiblesParaVincular.map(
                                            (p) => (
                                                <option
                                                    key={
                                                        p.id_presentacion
                                                    }
                                                    value={
                                                        p.id_presentacion
                                                    }
                                                >
                                                    {p.nombre}

                                                    {p.descripcion
                                                        ? ` (${p.descripcion})`
                                                        : ''}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {presentacionesDisponiblesParaVincular.length ===
                                        0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            No hay otras
                                            presentaciones
                                            disponibles en
                                            el catálogo.{' '}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModo(
                                                        'nueva'
                                                    );

                                                    setFormulario(
                                                        formularioVacio()
                                                    );
                                                }}
                                                className="font-medium text-pink-600 underline"
                                            >
                                                Crear una nueva
                                            </button>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Nombre de Presentación
                                        </label>

                                        <input
                                            name="nombre"
                                            placeholder="Ej. Porción 150g, Caja x 6..."
                                            value={
                                                formulario.nombre
                                            }
                                            onChange={
                                                manejarCambio
                                            }
                                            required
                                            maxLength={
                                                150
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Descripción (opcional)
                                        </label>

                                        <input
                                            name="descripcion"
                                            placeholder="Detalle o gramaje..."
                                            value={
                                                formulario
                                                    .descripcion
                                            }
                                            onChange={
                                                manejarCambio
                                            }
                                            maxLength={
                                                255
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Precio */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Precio para este Producto (Bs)
                                </label>

                                <input
                                    name="precio"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Ej. 150.00"
                                    value={
                                        formulario.precio
                                    }
                                    onChange={
                                        manejarCambio
                                    }
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>

                            {/* Permite personalización */}
                            <div className="flex items-end">
                                <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3">
                                    <input
                                        type="checkbox"
                                        name="permite_personalizacion"
                                        checked={
                                            formulario
                                                .permite_personalizacion
                                        }
                                        onChange={
                                            manejarCambio
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />

                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            Permite personalización
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            Permite agregar
                                            decoración,
                                            mensaje u otro
                                            detalle con costo
                                            adicional.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="mt-4 flex justify-end gap-2">

                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={
                                        cancelarEdicion
                                    }
                                    disabled={
                                        guardando
                                    }
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    guardando
                                }
                                className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                            >
                                {guardando
                                    ? 'Procesando...'
                                    : editandoId
                                    ? 'Actualizar Configuración'
                                    : modo ===
                                      'vincular'
                                    ? 'Vincular Presentación'
                                    : 'Crear y Vincular'}
                            </button>
                        </div>
                    </form>

                    {/* Tabla */}
                    {cargando ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Cargando presentaciones...
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                            Presentación
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                            Descripción
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                            Precio (Bs)
                                        </th>

                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                                            Personalizable
                                        </th>

                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                                            Estado Catálogo
                                        </th>

                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {presentaciones.map(
                                        (pres) => (
                                            <tr
                                                key={
                                                    pres.id_presentacion
                                                }
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {
                                                        pres.nombre
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {pres.descripcion ||
                                                        '—'}
                                                </td>

                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                                    Bs{' '}
                                                    {obtenerPrecio(
                                                        pres
                                                    ).toFixed(
                                                        2
                                                    )}
                                                </td>

                                                {/* Personalización */}
                                                <td className="px-4 py-3 text-center">
                                                    {permitePersonalizacion(
                                                        pres
                                                    ) ? (
                                                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                                            Sí
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                            No
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-4 py-3 text-center text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            cambiarEstado(
                                                                pres
                                                            )
                                                        }
                                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                                                            pres.estado
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                        title="Clic para cambiar estado en el catálogo"
                                                    >
                                                        {pres.estado
                                                            ? 'Activa'
                                                            : 'Inactiva'}
                                                    </button>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                iniciarEdicion(
                                                                    pres
                                                                )
                                                            }
                                                            className="font-medium text-pink-600 hover:text-pink-900"
                                                        >
                                                            Modificar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                desvincular(
                                                                    pres
                                                                )
                                                            }
                                                            className="font-medium text-red-600 hover:text-red-900"
                                                        >
                                                            Desvincular
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}

                                    {presentaciones.length ===
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="px-4 py-8 text-center text-sm text-gray-500"
                                            >
                                                Este producto
                                                aún no tiene
                                                ninguna
                                                presentación
                                                asignada. Elige
                                                una del catálogo
                                                o crea una nueva
                                                arriba.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PresentacionesModal;
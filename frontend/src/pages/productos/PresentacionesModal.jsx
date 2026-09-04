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

    // Modo: 'vincular' (elegir existente) o 'nueva' (crear en catálogo y vincular)
    const [modo, setModo] = useState('vincular');
    const [editandoId, setEditandoId] = useState(null);

    const [formulario, setFormulario] = useState({
        id_presentacion: '',
        nombre: '',
        precio: '',
        descripcion: ''
    });

    const [guardando, setGuardando] = useState(false);

    const cargarDatos = useCallback(async () => {
        if (!producto) return;
        try {
            setCargando(true);
            setError('');
            // 1. Presentaciones asignadas a este producto
            const respProducto = await listarPresentaciones({ id_producto: producto.id_producto });
            setPresentaciones(respProducto.presentaciones ?? []);

            // 2. Catálogo global de todas las presentaciones activas
            const respCatalogo = await listarPresentaciones({ estado: true });
            setCatalogoGlobal(respCatalogo.presentaciones ?? []);
        } catch (err) {
            setError(err.message || 'Error al cargar presentaciones.');
        } finally {
            setCargando(false);
        }
    }, [producto]);

    useEffect(() => {
        if (isOpen && producto) {
            cargarDatos();
            setEditandoId(null);
            setModo('vincular');
            setFormulario({
                id_presentacion: '',
                nombre: '',
                precio: '',
                descripcion: ''
            });
            setError('');
            setMensaje('');
        }
    }, [isOpen, producto, cargarDatos]);

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const manejarGuardado = async (e) => {
        e.preventDefault();
        try {
            setGuardando(true);
            setError('');
            setMensaje('');

            // Validar que el precio sea mayor a 0 según DB constraint
            const precioNum = parseFloat(formulario.precio);
            if (isNaN(precioNum) || precioNum <= 0) {
                setError('El precio debe ser un número mayor a 0.');
                setGuardando(false);
                return;
            }

            if (editandoId) {
                // Actualizar precio en la tabla pivote producto_presentacion
                await actualizarPrecioPresentacionProducto(producto.id_producto, editandoId, {
                    precio: precioNum
                });
                setMensaje('Precio de la presentación actualizado con éxito.');
            } else if (modo === 'vincular') {
                // Asignar presentación existente
                if (!formulario.id_presentacion) {
                    setError('Seleccione una presentación del catálogo.');
                    setGuardando(false);
                    return;
                }
                await asignarPresentacionProducto(producto.id_producto, {
                    id_presentacion: parseInt(formulario.id_presentacion, 10),
                    precio: precioNum
                });
                setMensaje('Presentación vinculada al producto con éxito.');
            } else {
                // Crear nueva presentación en el catálogo y asignarla inmediatamente al producto
                if (!formulario.nombre.trim()) {
                    setError('Ingrese el nombre de la nueva presentación.');
                    setGuardando(false);
                    return;
                }

                const respNueva = await crearPresentacion({
                    nombre: formulario.nombre.trim(),
                    descripcion: formulario.descripcion ? formulario.descripcion.trim() : null
                });

                const nuevaId = respNueva.presentacion?.id_presentacion;
                if (!nuevaId) {
                    throw new Error('No se pudo obtener el ID de la nueva presentación.');
                }

                await asignarPresentacionProducto(producto.id_producto, {
                    id_presentacion: nuevaId,
                    precio: precioNum
                });
                setMensaje('Nueva presentación creada y vinculada al producto con éxito.');
            }

            // Limpiar formulario y recargar datos
            setFormulario({
                id_presentacion: '',
                nombre: '',
                precio: '',
                descripcion: ''
            });
            setEditandoId(null);
            await cargarDatos();
        } catch (err) {
            const errores = err.data?.errors;
            if (errores) {
                setError(Object.values(errores)[0][0]);
            } else {
                setError(err.message || 'Error al guardar presentación.');
            }
        } finally {
            setGuardando(false);
        }
    };

    const obtenerPrecio = (pres) => {
        const p = pres?.pivot?.precio ?? pres?.productos?.find((prod) => prod.id_producto === producto?.id_producto)?.pivot?.precio ?? pres?.productos?.[0]?.pivot?.precio;
        return p !== undefined && p !== null ? parseFloat(p) : 0;
    };

    const iniciarEdicion = (pres) => {
        const precio = pres?.pivot?.precio ?? pres?.productos?.find((prod) => prod.id_producto === producto?.id_producto)?.pivot?.precio ?? pres?.productos?.[0]?.pivot?.precio ?? '';
        setEditandoId(pres.id_presentacion);
        setFormulario({
            id_presentacion: pres.id_presentacion,
            nombre: pres.nombre,
            descripcion: pres.descripcion || '',
            precio: precio
        });
        setError('');
        setMensaje('');
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setFormulario({
            id_presentacion: '',
            nombre: '',
            precio: '',
            descripcion: ''
        });
        setError('');
        setMensaje('');
    };

    const desvincular = async (pres) => {
        if (!window.confirm(`¿Deseas desvincular la presentación "${pres.nombre}" de este producto? (La presentación seguirá existiendo en el catálogo general)`)) {
            return;
        }

        try {
            setCargando(true);
            setError('');
            setMensaje('');
            await desvincularPresentacionProducto(producto.id_producto, pres.id_presentacion);
            setMensaje('Presentación desvinculada del producto con éxito.');
            await cargarDatos();
        } catch (err) {
            setError(err.message || 'Error al desvincular la presentación.');
        } finally {
            setCargando(false);
        }
    };

    const cambiarEstado = async (pres) => {
        try {
            await cambiarEstadoPresentacion(pres.id_presentacion, !pres.estado);
            await cargarDatos();
        } catch (err) {
            setError(err.message || 'Error al cambiar estado.');
        }
    };

    if (!isOpen || !producto) return null;

    // Filtrar catálogo para que no muestre presentaciones que ya estén vinculadas (al vincular)
    const idsVinculados = new Set(presentaciones.map((p) => p.id_presentacion));
    const presentacionesDisponiblesParaVincular = catalogoGlobal.filter(
        (p) => !idsVinculados.has(p.id_presentacion)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Presentaciones y Precios
                        </h2>
                        <p className="text-sm text-gray-500">
                            Producto: <span className="font-semibold text-gray-700">{producto.nombre}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    {mensaje && (
                        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            {mensaje}
                        </div>
                    )}

                    {/* Formulario de Asignación / Edición */}
                    <form onSubmit={manejarGuardado} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">
                                {editandoId 
                                    ? `Editar Precio de: ${formulario.nombre}` 
                                    : 'Añadir Presentación al Producto'}
                            </h3>

                            {!editandoId && (
                                <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setModo('vincular')}
                                        className={`rounded-md px-3 py-1.5 transition ${
                                            modo === 'vincular'
                                                ? 'bg-pink-600 text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Elegir del Catálogo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModo('nueva')}
                                        className={`rounded-md px-3 py-1.5 transition ${
                                            modo === 'nueva'
                                                ? 'bg-pink-600 text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        + Crear Nueva Presentación
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {editandoId ? (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Presentación</label>
                                    <input
                                        type="text"
                                        value={formulario.nombre}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                                    />
                                </div>
                            ) : modo === 'vincular' ? (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Seleccionar Presentación
                                    </label>
                                    <select
                                        name="id_presentacion"
                                        value={formulario.id_presentacion}
                                        onChange={manejarCambio}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    >
                                        <option value="">Seleccione una presentación...</option>
                                        {presentacionesDisponiblesParaVincular.map((p) => (
                                            <option key={p.id_presentacion} value={p.id_presentacion}>
                                                {p.nombre} {p.descripcion ? `(${p.descripcion})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {presentacionesDisponiblesParaVincular.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            No hay otras presentaciones disponibles en el catálogo.{' '}
                                            <button
                                                type="button"
                                                onClick={() => setModo('nueva')}
                                                className="text-pink-600 underline font-medium"
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
                                            value={formulario.nombre}
                                            onChange={manejarCambio}
                                            required
                                            maxLength={150}
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
                                            value={formulario.descripcion}
                                            onChange={manejarCambio}
                                            maxLength={255}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Precio para este Producto (Bs)
                                </label>
                                <input
                                    name="precio"
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    placeholder="Ej. 15 o 15.50"
                                    value={formulario.precio}
                                    onChange={manejarCambio}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicion}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={guardando}
                                className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                            >
                                {guardando
                                    ? 'Procesando...'
                                    : editandoId
                                    ? 'Actualizar Precio'
                                    : modo === 'vincular'
                                    ? 'Vincular Presentación'
                                    : 'Crear y Vincular'}
                            </button>
                        </div>
                    </form>

                    {/* Listado de Presentaciones del Producto */}
                    {cargando ? (
                        <div className="py-8 text-center text-sm text-gray-500">Cargando presentaciones...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Presentación</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Descripción</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Precio (Bs)</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">Estado Catálogo</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {presentaciones.map((pres) => (
                                        <tr key={pres.id_presentacion} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{pres.nombre}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{pres.descripcion || '—'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                                Bs {obtenerPrecio(pres).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">
                                                <button
                                                    onClick={() => cambiarEstado(pres)}
                                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                                                        pres.estado
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    }`}
                                                    title="Clic para cambiar estado en el catálogo"
                                                >
                                                    {pres.estado ? 'Activa' : 'Inactiva'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => iniciarEdicion(pres)}
                                                        className="font-medium text-pink-600 hover:text-pink-900"
                                                    >
                                                        Modificar Precio
                                                    </button>
                                                    <button
                                                        onClick={() => desvincular(pres)}
                                                        className="font-medium text-red-600 hover:text-red-900"
                                                    >
                                                        Desvincular
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {presentaciones.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Este producto aún no tiene ninguna presentación asignada. Elige una del catálogo o crea una nueva arriba.
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

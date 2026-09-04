import { useState, useEffect, useCallback } from 'react';
import {
    listarCategorias,
    crearCategoria,
    actualizarCategoria,
} from '../../services/categoriaService.js';

function CategoriasModal({ isOpen, onClose }) {
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const [editandoId, setEditandoId] = useState(null);
    const [nombreForm, setNombreForm] = useState('');
    const [estadoForm, setEstadoForm] = useState(true);

    const [guardando, setGuardando] = useState(false);

    const cargarCategorias = useCallback(async () => {
        try {
            setCargando(true);
            setError('');
            const respuesta = await listarCategorias();
            setCategorias(respuesta.categorias ?? []);
        } catch (err) {
            setError(err.message || 'Error al cargar categorías.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            cargarCategorias();
            setEditandoId(null);
            setNombreForm('');
            setEstadoForm(true);
            setError('');
            setMensaje('');
        }
    }, [isOpen, cargarCategorias]);

    const manejarGuardado = async (e) => {
        e.preventDefault();
        try {
            setGuardando(true);
            setError('');
            setMensaje('');

            if (editandoId) {
                await actualizarCategoria(editandoId, {
                    nombre: nombreForm,
                    estado: estadoForm
                });
                setMensaje('Categoría actualizada.');
            } else {
                await crearCategoria({
                    nombre: nombreForm,
                    estado: estadoForm
                });
                setMensaje('Categoría creada.');
            }

            setNombreForm('');
            setEstadoForm(true);
            setEditandoId(null);
            await cargarCategorias();
        } catch (err) {
            const errores = err.data?.errors;
            if (errores) {
                setError(Object.values(errores)[0][0]);
            } else {
                setError(err.message || 'Error al guardar categoría.');
            }
        } finally {
            setGuardando(false);
        }
    };

    const iniciarEdicion = (cat) => {
        setEditandoId(cat.id_categoria);
        setNombreForm(cat.nombre);
        setEstadoForm(cat.estado);
        setError('');
        setMensaje('');
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setNombreForm('');
        setEstadoForm(true);
        setError('');
        setMensaje('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        Gestionar Categorías
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
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

                    <form onSubmit={manejarGuardado} className="mb-6 rounded-lg bg-gray-50 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-gray-700">
                            {editandoId ? 'Editar Categoría' : 'Nueva Categoría'}
                        </h3>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={nombreForm}
                                    onChange={(e) => setNombreForm(e.target.value)}
                                    required
                                    maxLength={100}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                />
                            </div>
                            <div className="flex items-center gap-2 pb-2">
                                <input
                                    type="checkbox"
                                    id="estadoCat"
                                    checked={estadoForm}
                                    onChange={(e) => setEstadoForm(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                />
                                <label htmlFor="estadoCat" className="text-sm font-medium text-gray-700">
                                    Activa
                                </label>
                            </div>
                            <div className="flex gap-2">
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
                                    {guardando ? 'Guardando...' : (editandoId ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </div>
                    </form>

                    {cargando ? (
                        <div className="py-4 text-center text-sm text-gray-500">Cargando...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Nombre</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Estado</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {categorias.map((cat) => (
                                        <tr key={cat.id_categoria} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">{cat.id_categoria}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.nombre}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cat.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {cat.estado ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                <button
                                                    onClick={() => iniciarEdicion(cat)}
                                                    className="text-pink-600 hover:text-pink-900"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {categorias.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">
                                                No hay categorías registradas.
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

export default CategoriasModal;

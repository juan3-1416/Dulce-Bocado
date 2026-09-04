import { useState, useEffect, useCallback } from 'react';
import { listarProductos, cambiarEstadoProducto } from '../../services/productoService';
import { listarCategorias } from '../../services/categoriaService';

import ProductoModal from './ProductoModal';
import CategoriasModal from './CategoriasModal';
import PresentacionesModal from './PresentacionesModal';

function ProductosPage() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [filtros, setFiltros] = useState({
        buscar: '',
        id_categoria: '',
        estado: ''
    });

    const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
    const [modalCatAbierto, setModalCatAbierto] = useState(false);
    const [modalPresAbierto, setModalPresAbierto] = useState(false);

    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    const cargarFiltrosBasicos = useCallback(async () => {
        try {
            const respCat = await listarCategorias({ solo_activas: true });
            setCategorias(respCat.categorias ?? []);
        } catch (err) {
            console.error("Error al cargar categorías", err);
        }
    }, []);

    const cargarProductos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');
            const resp = await listarProductos(filtros);
            setProductos(resp.productos ?? []);
        } catch (err) {
            setError(err.message || 'Error al cargar productos.');
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        cargarFiltrosBasicos();
    }, [cargarFiltrosBasicos]);

    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);

    const manejarCambioFiltro = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };

    const toggleEstadoProducto = async (producto) => {
        if (!window.confirm(`¿Seguro que deseas ${producto.estado ? 'desactivar' : 'activar'} el producto "${producto.nombre}"?`)) return;
        try {
            await cambiarEstadoProducto(producto.id_producto, !producto.estado);
            cargarProductos();
        } catch (err) {
            alert(err.message || 'Error al cambiar estado.');
        }
    };

    const abrirNuevoProducto = () => {
        setProductoSeleccionado(null);
        setModalProductoAbierto(true);
    };

    const abrirEditarProducto = (prod) => {
        setProductoSeleccionado(prod);
        setModalProductoAbierto(true);
    };

    const abrirPresentaciones = (prod) => {
        setProductoSeleccionado(prod);
        setModalPresAbierto(true);
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
                    <p className="mt-1 text-sm text-gray-600">Administra los productos, presentaciones y categorías.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setModalCatAbierto(true)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Gestionar Categorías
                    </button>
                    <button
                        onClick={abrirNuevoProducto}
                        className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                    >
                        Nuevo Producto
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Barra de Filtros */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    name="buscar"
                    placeholder="Buscar producto..."
                    value={filtros.buscar}
                    onChange={manejarCambioFiltro}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <select
                    name="id_categoria"
                    value={filtros.id_categoria}
                    onChange={manejarCambioFiltro}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => (
                        <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                    ))}
                </select>
                <select
                    name="estado"
                    value={filtros.estado}
                    onChange={manejarCambioFiltro}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                    <option value="">Todos los estados</option>
                    <option value="true">Activos</option>
                    <option value="false">Inactivos</option>
                </select>
            </div>

            {/* Tabla de Productos */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {cargando ? (
                    <div className="p-8 text-center text-gray-500">Cargando catálogo...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Producto</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoría</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">Presentaciones</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">Estado</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {productos.map((prod) => (
                                    <tr key={prod.id_producto} className="hover:bg-gray-50">
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-gray-900">{prod.nombre}</div>
                                            <div className="text-sm text-gray-500">{prod.descripcion}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {prod.categoria?.nombre || 'N/A'}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                                {prod.presentaciones_count || 0} vinculadas
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${prod.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {prod.estado ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => abrirPresentaciones(prod)}
                                                    className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                                >
                                                    Gestionar Presentaciones
                                                </button>
                                                <button
                                                    onClick={() => abrirEditarProducto(prod)}
                                                    className="rounded border border-pink-200 px-2 py-1 text-xs font-semibold text-pink-600 hover:bg-pink-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => toggleEstadoProducto(prod)}
                                                    className={`rounded border px-2 py-1 text-xs font-semibold ${prod.estado ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                                >
                                                    {prod.estado ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {productos.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-500">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modales */}
            <CategoriasModal 
                isOpen={modalCatAbierto} 
                onClose={() => { setModalCatAbierto(false); cargarFiltrosBasicos(); }} 
            />
            <ProductoModal
                isOpen={modalProductoAbierto}
                onClose={() => setModalProductoAbierto(false)}
                productoEditando={productoSeleccionado}
                categorias={categorias}
                onCategoriaCreada={cargarFiltrosBasicos}
                onSaved={() => {
                    setModalProductoAbierto(false);
                    cargarProductos();
                    cargarFiltrosBasicos();
                }}
            />
            <PresentacionesModal
                isOpen={modalPresAbierto}
                onClose={() => { setModalPresAbierto(false); cargarProductos(); }}
                producto={productoSeleccionado}
            />
        </section>
    );
}

export default ProductosPage;

import { useState, useEffect } from 'react';
import { crearProducto, actualizarProducto } from '../../services/productoService.js';
import { crearCategoria } from '../../services/categoriaService.js';
import { listarPresentaciones, crearPresentacion } from '../../services/presentacionService.js';

function ProductoModal({ isOpen, onClose, productoEditando, categorias = [], onSaved, onCategoriaCreada }) {
    const [formulario, setFormulario] = useState({
        nombre: '',
        descripcion: '',
        id_categoria: '',
        estado: true
    });

    const [listaCategorias, setListaCategorias] = useState(categorias);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    // --- Sub-sección: Creación rápida de Categoría inline ---
    const [mostrarCrearCat, setMostrarCrearCat] = useState(false);
    const [nuevaCatNombre, setNuevaCatNombre] = useState('');
    const [guardandoCat, setGuardandoCat] = useState(false);
    const [errorCat, setErrorCat] = useState('');

    // --- Sub-sección: Selección y Creación de Presentaciones para nuevo producto ---
    const [catalogoPresentaciones, setCatalogoPresentaciones] = useState([]);
    const [presentacionesSeleccionadas, setPresentacionesSeleccionadas] = useState([]);
    
    // Para agregar existente:
    const [presSeleccionadaId, setPresSeleccionadaId] = useState('');
    const [precioPres, setPrecioPres] = useState('');

    // Para crear nueva presentación al vuelo:
    const [mostrarCrearPres, setMostrarCrearPres] = useState(false);
    const [nuevaPresNombre, setNuevaPresNombre] = useState('');
    const [nuevaPresDesc, setNuevaPresDesc] = useState('');
    const [nuevaPresPrecio, setNuevaPresPrecio] = useState('');
    const [guardandoPres, setGuardandoPres] = useState(false);
    const [errorPres, setErrorPres] = useState('');

    // Sincronizar categorías recibidas por props
    useEffect(() => {
        setListaCategorias(categorias);
    }, [categorias]);

    // Cargar catálogo de presentaciones al abrir
    useEffect(() => {
        if (isOpen) {
            if (productoEditando) {
                setFormulario({
                    nombre: productoEditando.nombre,
                    descripcion: productoEditando.descripcion || '',
                    id_categoria: productoEditando.id_categoria,
                    estado: productoEditando.estado
                });
                setPresentacionesSeleccionadas([]);
            } else {
                setFormulario({
                    nombre: '',
                    descripcion: '',
                    id_categoria: '',
                    estado: true
                });
                setPresentacionesSeleccionadas([]);

                // Cargar presentaciones activas para elegir
                listarPresentaciones({ estado: true })
                    .then((res) => setCatalogoPresentaciones(res.presentaciones ?? []))
                    .catch(() => setCatalogoPresentaciones([]));
            }

            setError('');
            setErrorCat('');
            setErrorPres('');
            setMostrarCrearCat(false);
            setMostrarCrearPres(false);
            setNuevaCatNombre('');
            setNuevaPresNombre('');
            setNuevaPresDesc('');
            setNuevaPresPrecio('');
            setPresSeleccionadaId('');
            setPrecioPres('');
        }
    }, [isOpen, productoEditando]);

    const manejarCambio = (e) => {
        const { name, value, type, checked } = e.target;
        setFormulario((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // --- Manejo de Categoría Rápida ---
    const manejarCrearCategoria = async (e) => {
        e.preventDefault();
        if (!nuevaCatNombre.trim()) {
            setErrorCat('Ingrese el nombre de la categoría.');
            return;
        }

        try {
            setGuardandoCat(true);
            setErrorCat('');
            const resp = await crearCategoria({
                nombre: nuevaCatNombre.trim(),
                estado: true
            });

            const nueva = resp.categoria;
            if (nueva) {
                setListaCategorias((prev) => [...prev, nueva]);
                setFormulario((prev) => ({ ...prev, id_categoria: nueva.id_categoria }));
                if (onCategoriaCreada) onCategoriaCreada();
            }

            setNuevaCatNombre('');
            setMostrarCrearCat(false);
        } catch (err) {
            setErrorCat(err.message || 'Error al crear la categoría.');
        } finally {
            setGuardandoCat(false);
        }
    };

    // --- Manejo de Presentaciones al crear producto ---
    const agregarPresentacionExistente = () => {
        setErrorPres('');
        if (!presSeleccionadaId) {
            setErrorPres('Seleccione una presentación del catálogo.');
            return;
        }

        const precioNum = parseFloat(precioPres);
        if (isNaN(precioNum) || precioNum <= 0) {
            setErrorPres('Ingrese un precio válido mayor a 0.');
            return;
        }

        const presObj = catalogoPresentaciones.find(
            (p) => p.id_presentacion === parseInt(presSeleccionadaId, 10)
        );

        if (!presObj) return;

        // Evitar duplicados
        if (presentacionesSeleccionadas.some((p) => p.id_presentacion === presObj.id_presentacion)) {
            setErrorPres('Esta presentación ya fue agregada.');
            return;
        }

        setPresentacionesSeleccionadas((prev) => [
            ...prev,
            {
                id_presentacion: presObj.id_presentacion,
                nombre: presObj.nombre,
                descripcion: presObj.descripcion,
                precio: precioNum
            }
        ]);

        setPresSeleccionadaId('');
        setPrecioPres('');
    };

    const manejarCrearPresentacionAlVuelo = async (e) => {
        e.preventDefault();
        setErrorPres('');

        if (!nuevaPresNombre.trim()) {
            setErrorPres('El nombre de la presentación es requerido.');
            return;
        }

        const precioNum = parseFloat(nuevaPresPrecio);
        if (isNaN(precioNum) || precioNum <= 0) {
            setErrorPres('Ingrese un precio válido mayor a 0.');
            return;
        }

        try {
            setGuardandoPres(true);
            const resp = await crearPresentacion({
                nombre: nuevaPresNombre.trim(),
                descripcion: nuevaPresDesc.trim() || null
            });

            const nuevaPres = resp.presentacion;
            if (nuevaPres) {
                setCatalogoPresentaciones((prev) => [...prev, nuevaPres]);
                setPresentacionesSeleccionadas((prev) => [
                    ...prev,
                    {
                        id_presentacion: nuevaPres.id_presentacion,
                        nombre: nuevaPres.nombre,
                        descripcion: nuevaPres.descripcion,
                        precio: precioNum
                    }
                ]);
            }

            setNuevaPresNombre('');
            setNuevaPresDesc('');
            setNuevaPresPrecio('');
            setMostrarCrearPres(false);
        } catch (err) {
            setErrorPres(err.message || 'Error al crear la presentación.');
        } finally {
            setGuardandoPres(false);
        }
    };

    const quitarPresentacion = (idPres) => {
        setPresentacionesSeleccionadas((prev) =>
            prev.filter((p) => p.id_presentacion !== idPres)
        );
    };

    // --- Guardado del Producto ---
    const manejarGuardado = async (e) => {
        e.preventDefault();
        try {
            setGuardando(true);
            setError('');

            if (productoEditando) {
                await actualizarProducto(productoEditando.id_producto, formulario);
            } else {
                const payload = {
                    ...formulario,
                    ...(presentacionesSeleccionadas.length > 0
                        ? {
                              presentaciones: presentacionesSeleccionadas.map((p) => ({
                                  id_presentacion: p.id_presentacion,
                                  precio: p.precio
                              }))
                          }
                        : {})
                };
                await crearProducto(payload);
            }

            onSaved();
        } catch (err) {
            const errores = err.data?.errors;
            if (errores) {
                setError(Object.values(errores)[0][0]);
            } else {
                setError(err.message || 'Error al guardar el producto.');
            }
        } finally {
            setGuardando(false);
        }
    };

    if (!isOpen) return null;

    // Presentaciones del catálogo aún no seleccionadas
    const presentacionesDisponibles = catalogoPresentaciones.filter(
        (cp) => !presentacionesSeleccionadas.some((ps) => ps.id_presentacion === cp.id_presentacion)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[95vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <form onSubmit={manejarGuardado} className="overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Datos Básicos */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Nombre del Producto *
                        </label>
                        <input
                            name="nombre"
                            type="text"
                            placeholder="Ej. Torta Selva Negra"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            required
                            maxLength={100}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        />
                    </div>

                    {/* Categoría con opción de crear inline */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Categoría *
                            </label>
                            <button
                                type="button"
                                onClick={() => setMostrarCrearCat(!mostrarCrearCat)}
                                className="text-xs font-semibold text-pink-600 hover:text-pink-800"
                            >
                                {mostrarCrearCat ? '− Ocultar formulario' : '+ Nueva Categoría'}
                            </button>
                        </div>

                        {/* Sub-formulario rápido para crear categoría */}
                        {mostrarCrearCat && (
                            <div className="mb-3 rounded-lg border border-pink-200 bg-pink-50 p-3">
                                <p className="mb-2 text-xs font-medium text-pink-900">Crear y seleccionar nueva categoría:</p>
                                {errorCat && <p className="mb-2 text-xs text-red-600">{errorCat}</p>}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre de la categoría..."
                                        value={nuevaCatNombre}
                                        onChange={(e) => setNuevaCatNombre(e.target.value)}
                                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={manejarCrearCategoria}
                                        disabled={guardandoCat}
                                        className="rounded-md bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                                    >
                                        {guardandoCat ? 'Creando...' : 'Crear'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <select
                            name="id_categoria"
                            value={formulario.id_categoria}
                            onChange={manejarCambio}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        >
                            <option value="">Seleccione una categoría...</option>
                            {listaCategorias.map((cat) => (
                                <option key={cat.id_categoria} value={cat.id_categoria}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Descripción
                        </label>
                        <textarea
                            name="descripcion"
                            placeholder="Descripción o ingredientes principales..."
                            value={formulario.descripcion}
                            onChange={manejarCambio}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        />
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="estadoProd"
                            name="estado"
                            checked={formulario.estado}
                            onChange={manejarCambio}
                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <label htmlFor="estadoProd" className="text-sm font-medium text-gray-700">
                            Producto Activo
                        </label>
                    </div>

                    {/* Sección de Presentaciones iniciales (solo al crear nuevo producto) */}
                    {!productoEditando ? (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">
                                        Presentaciones y Precios Iniciales (opcional)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Asigna las presentaciones de venta que tendrá este producto.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMostrarCrearPres(!mostrarCrearPres)}
                                    className="text-xs font-semibold text-pink-600 hover:text-pink-800"
                                >
                                    {mostrarCrearPres ? '− Elegir del catálogo' : '+ Crear Nueva Presentación'}
                                </button>
                            </div>

                            {errorPres && (
                                <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                                    {errorPres}
                                </div>
                            )}

                            {/* Opción A: Crear nueva presentación al vuelo */}
                            {mostrarCrearPres ? (
                                <div className="mb-3 rounded-lg border border-pink-200 bg-pink-50 p-3">
                                    <p className="mb-2 text-xs font-medium text-pink-900">
                                        Registrar una nueva presentación en el catálogo y agregarla a este producto:
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <input
                                            type="text"
                                            placeholder="Nombre (ej. Porción 150g)"
                                            value={nuevaPresNombre}
                                            onChange={(e) => setNuevaPresNombre(e.target.value)}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Descripción (opcional)"
                                            value={nuevaPresDesc}
                                            onChange={(e) => setNuevaPresDesc(e.target.value)}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0.01"
                                                placeholder="Precio (Bs)"
                                                value={nuevaPresPrecio}
                                                onChange={(e) => setNuevaPresPrecio(e.target.value)}
                                                className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={manejarCrearPresentacionAlVuelo}
                                                disabled={guardandoPres}
                                                className="flex-1 rounded-md bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                                            >
                                                {guardandoPres ? '...' : 'Añadir'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Opción B: Elegir del catálogo existente */
                                <div className="mb-3 flex flex-col sm:flex-row gap-2">
                                    <select
                                        value={presSeleccionadaId}
                                        onChange={(e) => setPresSeleccionadaId(e.target.value)}
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                    >
                                        <option value="">Seleccione una presentación...</option>
                                        {presentacionesDisponibles.map((p) => (
                                            <option key={p.id_presentacion} value={p.id_presentacion}>
                                                {p.nombre} {p.descripcion ? `(${p.descripcion})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        placeholder="Precio (Bs)"
                                        value={precioPres}
                                        onChange={(e) => setPrecioPres(e.target.value)}
                                        className="w-full sm:w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-pink-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={agregarPresentacionExistente}
                                        className="rounded-lg bg-gray-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-black"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                            )}

                            {/* Lista de presentaciones que se vincularán */}
                            {presentacionesSeleccionadas.length > 0 ? (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                        <thead className="bg-gray-100 text-gray-600 uppercase font-semibold">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Presentación</th>
                                                <th className="px-3 py-2 text-left">Precio</th>
                                                <th className="px-3 py-2 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {presentacionesSeleccionadas.map((item) => (
                                                <tr key={item.id_presentacion}>
                                                    <td className="px-3 py-2 font-medium text-gray-800">
                                                        {item.nombre}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
                                                        Bs {parseFloat(item.precio).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => quitarPresentacion(item.id_presentacion)}
                                                            className="text-red-600 hover:text-red-900 font-semibold"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">
                                    No has agregado ninguna presentación aún. Puedes vincularlas ahora o después con el botón "Gestionar Presentaciones".
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                            Para vincular, desvincular o cambiar precios de las presentaciones de este producto, utiliza el botón <span className="font-semibold">"Gestionar Presentaciones"</span> en la tabla principal.
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={guardando}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                        >
                            {guardando ? 'Guardando...' : productoEditando ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductoModal;

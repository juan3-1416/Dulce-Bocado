import { useState, useEffect, useCallback } from 'react';
import {
    listarPresentaciones,
    crearPresentacion,
    cambiarEstadoPresentacion,
    asignarPresentacionProducto,
    actualizarPrecioPresentacionProducto,
    desvincularPresentacionProducto
} from '../../services/presentacionService.js';
import {
    formularioVacio,
    normalizarBooleano,
    obtenerPivot,
    obtenerPrecio,
    permitePersonalizacion
} from './utils/presentacionHelpers.js';
import PresentacionForm from './components/PresentacionForm.jsx';
import PresentacionesTabla from './components/PresentacionesTabla.jsx';

function PresentacionesModal({ isOpen, onClose, producto }) {
    const [presentaciones, setPresentaciones] = useState([]);
    const [catalogoGlobal, setCatalogoGlobal] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Modo: "vincular" = elegir existente del catálogo | "nueva" = crear nueva y vincular
    const [modo, setModo] = useState('vincular');

    // ID de la presentación siendo editada en el formulario
    const [editandoId, setEditandoId] = useState(null);

    const [formulario, setFormulario] = useState(formularioVacio());
    const [guardando, setGuardando] = useState(false);

    /*
    | Cargar datos
    */
    const cargarDatos = useCallback(async () => {
        if (!producto) {
            return;
        }

        try {
            setCargando(true);
            setError('');

            // Presentaciones vinculadas al producto actual
            const respProducto = await listarPresentaciones({
                id_producto: producto.id_producto
            });
            setPresentaciones(respProducto.presentaciones ?? []);

            // Catálogo global de presentaciones activas
            const respCatalogo = await listarPresentaciones({
                estado: true
            });
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
            setFormulario(formularioVacio());
            setError('');
            setMensaje('');
        }
    }, [isOpen, producto, cargarDatos]);

    /*
    | Manejo del Formulario
    */
    const manejarCambio = (e) => {
        const { name, value, type, checked } = e.target;
        setFormulario((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const manejarGuardado = async (e) => {
        e.preventDefault();

        try {
            setGuardando(true);
            setError('');
            setMensaje('');

            const precioNum = parseFloat(formulario.precio);

            if (Number.isNaN(precioNum) || precioNum <= 0) {
                setError('El precio debe ser un número mayor a 0.');
                return;
            }

            // Editar configuración existente
            if (editandoId) {
                await actualizarPrecioPresentacionProducto(
                    producto.id_producto,
                    editandoId,
                    {
                        precio: precioNum,
                        permite_personalizacion: formulario.permite_personalizacion
                    }
                );
                setMensaje('Configuración de la presentación actualizada con éxito.');
            }
            // Vincular presentación existente del catálogo
            else if (modo === 'vincular') {
                if (!formulario.id_presentacion) {
                    setError('Seleccione una presentación del catálogo.');
                    return;
                }

                await asignarPresentacionProducto(
                    producto.id_producto,
                    {
                        id_presentacion: parseInt(formulario.id_presentacion, 10),
                        precio: precioNum,
                        permite_personalizacion: formulario.permite_personalizacion
                    }
                );
                setMensaje('Presentación vinculada al producto con éxito.');
            }
            // Crear nueva presentación y vincular
            else {
                if (!formulario.nombre.trim()) {
                    setError('Ingrese el nombre de la nueva presentación.');
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

                await asignarPresentacionProducto(
                    producto.id_producto,
                    {
                        id_presentacion: nuevaId,
                        precio: precioNum,
                        permite_personalizacion: formulario.permite_personalizacion
                    }
                );
                setMensaje('Nueva presentación creada y vinculada al producto con éxito.');
            }

            setFormulario(formularioVacio());
            setEditandoId(null);
            setModo('vincular');
            await cargarDatos();
        } catch (err) {
            const errores = err.data?.errors;

            if (errores) {
                const primerError = Object.values(errores)?.[0]?.[0];
                setError(primerError || 'Error de validación.');
            } else {
                setError(err.message || 'Error al guardar presentación.');
            }
        } finally {
            setGuardando(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Acciones sobre presentaciones
    |--------------------------------------------------------------------------
    */
    const iniciarEdicion = (pres) => {
        const pivot = obtenerPivot(pres, producto?.id_producto);

        setEditandoId(pres.id_presentacion);
        setFormulario({
            id_presentacion: pres.id_presentacion,
            nombre: pres.nombre || '',
            precio: pivot?.precio ?? '',
            descripcion: pres.descripcion || '',
            permite_personalizacion: normalizarBooleano(pivot?.permite_personalizacion)
        });

        setError('');
        setMensaje('');
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setFormulario(formularioVacio());
        setError('');
        setMensaje('');
    };

    const desvincular = async (pres) => {
        const confirmar = window.confirm(
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
            setError('');
            setMensaje('');

            await cambiarEstadoPresentacion(
                pres.id_presentacion,
                !pres.estado
            );

            await cargarDatos();
        } catch (err) {
            setError(err.message || 'Error al cambiar estado.');
        }
    };

    if (!isOpen || !producto) {
        return null;
    }

    const idsVinculados = new Set(presentaciones.map((p) => p.id_presentacion));
    const presentacionesDisponiblesParaVincular = catalogoGlobal.filter(
        (p) => !idsVinculados.has(p.id_presentacion)
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
                    {/* Alertas */}
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

                    {/* Formulario */}
                    <PresentacionForm
                        editandoId={editandoId}
                        modo={modo}
                        setModo={setModo}
                        formulario={formulario}
                        setFormulario={setFormulario}
                        manejarCambio={manejarCambio}
                        manejarGuardado={manejarGuardado}
                        cancelarEdicion={cancelarEdicion}
                        guardando={guardando}
                        presentacionesDisponiblesParaVincular={presentacionesDisponiblesParaVincular}
                        formularioVacio={formularioVacio}
                        setError={setError}
                        setMensaje={setMensaje}
                    />

                    {/* Tabla de presentaciones */}
                    <PresentacionesTabla
                        cargando={cargando}
                        presentaciones={presentaciones}
                        productoId={producto?.id_producto}
                        obtenerPrecio={obtenerPrecio}
                        permitePersonalizacion={permitePersonalizacion}
                        cambiarEstado={cambiarEstado}
                        iniciarEdicion={iniciarEdicion}
                        desvincular={desvincular}
                    />
                </div>
            </div>
        </div>
    );
}

export default PresentacionesModal;
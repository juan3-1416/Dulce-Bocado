import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    actualizarPedido,
    crearPedido,
    obtenerCatalogosPedido,
} from '../../services/pedidoService.js';

function PedidoModal({
    isOpen,
    onClose,
    pedidoEditando = null,
    onSaved,
}) {
    const [clientes, setClientes] = useState([]);
    const [presentaciones, setPresentaciones] = useState([]);

    const [cargandoCatalogos, setCargandoCatalogos] =
        useState(false);

    const [guardando, setGuardando] =
        useState(false);

    const [error, setError] =
        useState('');

    const formularioInicial = () => ({
        tipo_cliente: 'REGISTRADO',
        id_cliente: '',
        nombre_cliente_ocasional: '',
        fecha_entrega: '',
        hora_entrega: '',
        observaciones: '',
        detalles: [
            crearDetalleVacio(),
        ],
    });

    const [formulario, setFormulario] =
        useState(formularioInicial());

    /*
    |--------------------------------------------------------------------------
    | Crear línea vacía
    |--------------------------------------------------------------------------
    */

    function crearDetalleVacio() {
        return {
            uid:
                Date.now().toString() +
                Math.random().toString(36).slice(2),

            id_producto_presentacion: '',
            cantidad: 1,
            detalle_personalizacion: '',
            costo_personalizacion: '',
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Utilidades
    |--------------------------------------------------------------------------
    */

    const obtenerFechaInput = (fecha) => {
        if (!fecha) {
            return '';
        }

        return String(fecha).split('T')[0];
    };

    const obtenerHoraInput = (hora) => {
        if (!hora) {
            return '';
        }

        return String(hora).slice(0, 5);
    };

    const obtenerPresentacion = (
        idProductoPresentacion
    ) => {
        return presentaciones.find(
            (item) =>
                Number(
                    item.id_producto_presentacion
                ) ===
                Number(idProductoPresentacion)
        );
    };

    const obtenerNombrePresentacion = (
        item
    ) => {
        if (!item) {
            return 'Presentación no encontrada';
        }

        const producto =
            item.producto?.nombre ??
            'Producto';

        const presentacion =
            item.presentacion?.nombre ??
            'Presentación';

        return `${producto} - ${presentacion}`;
    };

    const normalizarNumero = (valor) => {
        const numero =
            Number.parseFloat(valor);

        return Number.isFinite(numero)
            ? numero
            : 0;
    };

    /*
    |--------------------------------------------------------------------------
    | Catálogos
    |--------------------------------------------------------------------------
    */

    const cargarCatalogos =
        useCallback(async () => {
            try {
                setCargandoCatalogos(true);
                setError('');

                const respuesta =
                    await obtenerCatalogosPedido();

                setClientes(
                    respuesta.clientes ?? []
                );

                setPresentaciones(
                    respuesta.presentaciones ?? []
                );
            } catch (err) {
                setError(
                    err.message ||
                    'No se pudieron cargar los catálogos del pedido.'
                );
            } finally {
                setCargandoCatalogos(false);
            }
        }, []);

    /*
    |--------------------------------------------------------------------------
    | Abrir modal
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        cargarCatalogos();
    }, [
        isOpen,
        cargarCatalogos,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Cargar pedido en edición
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (!pedidoEditando) {
            setFormulario(
                formularioInicial()
            );

            setError('');
            return;
        }

        const detalles =
            pedidoEditando.detalles?.map(
                (detalle) => ({
                    uid:
                        `detalle-${detalle.id_detalle_pedido}`,

                    id_producto_presentacion:
                        String(
                            detalle.id_producto_presentacion
                        ),

                    cantidad:
                        detalle.cantidad ?? 1,

                    detalle_personalizacion:
                        detalle.detalle_personalizacion ??
                        '',

                    costo_personalizacion:
                        detalle.costo_personalizacion ??
                        '',
                })
            ) ?? [];

        setFormulario({
            tipo_cliente:
                pedidoEditando.id_cliente
                    ? 'REGISTRADO'
                    : 'OCASIONAL',

            id_cliente:
                pedidoEditando.id_cliente
                    ? String(
                        pedidoEditando.id_cliente
                    )
                    : '',

            nombre_cliente_ocasional:
                pedidoEditando
                    .nombre_cliente_ocasional ??
                '',

            fecha_entrega:
                obtenerFechaInput(
                    pedidoEditando.fecha_entrega
                ),

            hora_entrega:
                obtenerHoraInput(
                    pedidoEditando.hora_entrega
                ),

            observaciones:
                pedidoEditando.observaciones ??
                '',

            detalles:
                detalles.length > 0
                    ? detalles
                    : [
                        crearDetalleVacio(),
                    ],
        });

        setError('');
    }, [
        isOpen,
        pedidoEditando,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Cambios generales
    |--------------------------------------------------------------------------
    */

    const manejarCambioFormulario = (
        e
    ) => {
        const {
            name,
            value,
        } = e.target;

        setFormulario(
            (prev) => ({
                ...prev,
                [name]: value,
            })
        );
    };

    const cambiarTipoCliente = (
        tipo
    ) => {
        setFormulario(
            (prev) => ({
                ...prev,

                tipo_cliente:
                    tipo,

                id_cliente:
                    tipo === 'REGISTRADO'
                        ? prev.id_cliente
                        : '',

                nombre_cliente_ocasional:
                    tipo === 'OCASIONAL'
                        ? prev
                            .nombre_cliente_ocasional
                        : '',
            })
        );

        setError('');
    };

    /*
    |--------------------------------------------------------------------------
    | Líneas de detalle
    |--------------------------------------------------------------------------
    */

    const agregarDetalle = () => {
        setFormulario(
            (prev) => ({
                ...prev,

                detalles: [
                    ...prev.detalles,
                    crearDetalleVacio(),
                ],
            })
        );
    };

    const eliminarDetalle = (
        indice
    ) => {
        setFormulario(
            (prev) => {
                if (
                    prev.detalles.length <=
                    1
                ) {
                    return prev;
                }

                return {
                    ...prev,

                    detalles:
                        prev.detalles.filter(
                            (_, i) =>
                                i !== indice
                        ),
                };
            }
        );
    };

    const cambiarDetalle = (
        indice,
        campo,
        valor
    ) => {
        setFormulario(
            (prev) => {
                const nuevosDetalles =
                    [...prev.detalles];

                const detalleActual = {
                    ...nuevosDetalles[
                        indice
                    ],
                };

                detalleActual[
                    campo
                ] = valor;

                /*
                 * Al cambiar de presentación,
                 * limpiamos una personalización
                 * que ya no sea válida.
                 */
                if (
                    campo ===
                    'id_producto_presentacion'
                ) {
                    const nuevaPresentacion =
                        obtenerPresentacion(
                            valor
                        );

                    if (
                        !nuevaPresentacion
                            ?.permite_personalizacion
                    ) {
                        detalleActual
                            .detalle_personalizacion =
                            '';

                        detalleActual
                            .costo_personalizacion =
                            '';
                    }
                }

                nuevosDetalles[
                    indice
                ] =
                    detalleActual;

                return {
                    ...prev,
                    detalles:
                        nuevosDetalles,
                };
            }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Cálculos visuales
    |--------------------------------------------------------------------------
    |
    | Son únicamente una vista previa.
    | Laravel vuelve a calcular todo.
    |
    */

    const calcularSubtotalDetalle = (
        detalle
    ) => {
        const presentacion =
            obtenerPresentacion(
                detalle.id_producto_presentacion
            );

        if (!presentacion) {
            return 0;
        }

        const precio =
            normalizarNumero(
                presentacion.precio
            );

        const cantidad =
            Math.max(
                0,
                Number.parseInt(
                    detalle.cantidad,
                    10
                ) || 0
            );

        const costo =
            normalizarNumero(
                detalle.costo_personalizacion
            );

        return (
            precio *
                cantidad +
            costo
        );
    };

    const totalVistaPrevia =
        useMemo(() => {
            return formulario.detalles.reduce(
                (
                    acumulado,
                    detalle
                ) =>
                    acumulado +
                    calcularSubtotalDetalle(
                        detalle
                    ),
                0
            );
        }, [
            formulario.detalles,
            presentaciones,
        ]);

    /*
    |--------------------------------------------------------------------------
    | Validación frontend
    |--------------------------------------------------------------------------
    */

    const validarFormulario = () => {
        if (
            formulario.tipo_cliente ===
                'REGISTRADO' &&
            !formulario.id_cliente
        ) {
            return 'Debe seleccionar un cliente registrado.';
        }

        if (
            formulario.tipo_cliente ===
                'OCASIONAL' &&
            !formulario
                .nombre_cliente_ocasional
                .trim()
        ) {
            return 'Debe ingresar el nombre del cliente ocasional.';
        }

        if (
            !formulario.fecha_entrega
        ) {
            return 'Debe seleccionar la fecha de entrega.';
        }

        if (
            !formulario.hora_entrega
        ) {
            return 'Debe seleccionar la hora de entrega.';
        }

        if (
            formulario.detalles.length ===
            0
        ) {
            return 'Debe agregar al menos un producto al pedido.';
        }

        for (
            let i = 0;
            i <
            formulario.detalles.length;
            i++
        ) {
            const detalle =
                formulario.detalles[i];

            if (
                !detalle
                    .id_producto_presentacion
            ) {
                return `Debe seleccionar la presentación de la línea ${
                    i + 1
                }.`;
            }

            const cantidad =
                Number.parseInt(
                    detalle.cantidad,
                    10
                );

            if (
                !Number.isInteger(
                    cantidad
                ) ||
                cantidad <= 0
            ) {
                return `La cantidad de la línea ${
                    i + 1
                } debe ser mayor a cero.`;
            }

            const presentacion =
                obtenerPresentacion(
                    detalle
                        .id_producto_presentacion
                );

            const costo =
                normalizarNumero(
                    detalle
                        .costo_personalizacion
                );

            if (costo < 0) {
                return `El costo de personalización de la línea ${
                    i + 1
                } no puede ser negativo.`;
            }

            if (
                !presentacion
                    ?.permite_personalizacion &&
                (
                    detalle
                        .detalle_personalizacion
                        .trim() ||
                    costo > 0
                )
            ) {
                return `La presentación de la línea ${
                    i + 1
                } no permite personalización.`;
            }

            if (
                costo > 0 &&
                !detalle
                    .detalle_personalizacion
                    .trim()
            ) {
                return `Debe describir la personalización de la línea ${
                    i + 1
                } cuando exista un costo adicional.`;
            }
        }

        return null;
    };

    /*
    |--------------------------------------------------------------------------
    | Preparar datos para Laravel
    |--------------------------------------------------------------------------
    */

    const construirPayload = () => {
        return {
            tipo_cliente:
                formulario.tipo_cliente,

            id_cliente:
                formulario.tipo_cliente ===
                'REGISTRADO'
                    ? Number(
                        formulario.id_cliente
                    )
                    : null,

            nombre_cliente_ocasional:
                formulario.tipo_cliente ===
                'OCASIONAL'
                    ? formulario
                        .nombre_cliente_ocasional
                        .trim()
                    : null,

            fecha_entrega:
                formulario.fecha_entrega,

            hora_entrega:
                formulario.hora_entrega,

            observaciones:
                formulario.observaciones
                    .trim() ||
                null,

            detalles:
                formulario.detalles.map(
                    (detalle) => ({
                        id_producto_presentacion:
                            Number(
                                detalle
                                    .id_producto_presentacion
                            ),

                        cantidad:
                            Number.parseInt(
                                detalle.cantidad,
                                10
                            ),

                        detalle_personalizacion:
                            detalle
                                .detalle_personalizacion
                                .trim() ||
                            null,

                        costo_personalizacion:
                            normalizarNumero(
                                detalle
                                    .costo_personalizacion
                            ),
                    })
                ),
        };
    };

    /*
    |--------------------------------------------------------------------------
    | Guardar
    |--------------------------------------------------------------------------
    */

    const manejarSubmit = async (
        e
    ) => {
        e.preventDefault();

        const errorValidacion =
            validarFormulario();

        if (errorValidacion) {
            setError(
                errorValidacion
            );

            return;
        }

        try {
            setGuardando(true);
            setError('');

            const payload =
                construirPayload();

            if (pedidoEditando) {
                await actualizarPedido(
                    pedidoEditando.id_pedido,
                    payload
                );
            } else {
                await crearPedido(
                    payload
                );
            }

            if (onSaved) {
                await onSaved();
            }

            onClose();
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
                    'No se pudo guardar el pedido.'
                );
            } else {
                setError(
                    err.message ||
                    'No se pudo guardar el pedido.'
                );
            }
        } finally {
            setGuardando(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Cerrar
    |--------------------------------------------------------------------------
    */

    const manejarCerrar = () => {
        if (guardando) {
            return;
        }

        setError('');
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">

                {/* Encabezado */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {pedidoEditando
                                ? `Editar Pedido #${pedidoEditando.id_pedido}`
                                : 'Nuevo Pedido'}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Registra productos, cliente y fecha de entrega.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            manejarCerrar
                        }
                        disabled={
                            guardando
                        }
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido */}
                <form
                    onSubmit={
                        manejarSubmit
                    }
                    className="overflow-y-auto"
                >
                    <div className="space-y-6 p-6">

                        {/* Error */}
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {cargandoCatalogos && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                                Cargando clientes y presentaciones...
                            </div>
                        )}

                        {/* Cliente */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                Cliente
                            </h3>

                            <div className="mb-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        cambiarTipoCliente(
                                            'REGISTRADO'
                                        )
                                    }
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                                        formulario.tipo_cliente ===
                                        'REGISTRADO'
                                            ? 'bg-pink-600 text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Cliente registrado
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        cambiarTipoCliente(
                                            'OCASIONAL'
                                        )
                                    }
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                                        formulario.tipo_cliente ===
                                        'OCASIONAL'
                                            ? 'bg-pink-600 text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Cliente ocasional
                                </button>
                            </div>

                            {formulario.tipo_cliente ===
                            'REGISTRADO' ? (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Cliente
                                    </label>

                                    <select
                                        name="id_cliente"
                                        value={
                                            formulario.id_cliente
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        disabled={
                                            cargandoCatalogos
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    >
                                        <option value="">
                                            Seleccione un cliente...
                                        </option>

                                        {clientes.map(
                                            (
                                                cliente
                                            ) => (
                                                <option
                                                    key={
                                                        cliente.id_cliente
                                                    }
                                                    value={
                                                        cliente.id_cliente
                                                    }
                                                >
                                                    {cliente.nombre}
                                                    {cliente.apellido
                                                        ? ` ${cliente.apellido}`
                                                        : ''}
                                                    {cliente.ci_nit
                                                        ? ` - CI/NIT: ${cliente.ci_nit}`
                                                        : ''}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Nombre del cliente ocasional
                                    </label>

                                    <input
                                        type="text"
                                        name="nombre_cliente_ocasional"
                                        value={
                                            formulario
                                                .nombre_cliente_ocasional
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        maxLength={
                                            150
                                        }
                                        required
                                        placeholder="Ej. Carlos Mendoza"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Entrega */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                Fecha y hora de entrega
                            </h3>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Fecha de entrega
                                    </label>

                                    <input
                                        type="date"
                                        name="fecha_entrega"
                                        value={
                                            formulario.fecha_entrega
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Hora de entrega
                                    </label>

                                    <input
                                        type="time"
                                        name="hora_entrega"
                                        value={
                                            formulario.hora_entrega
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Productos */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        Productos del pedido
                                    </h3>

                                    <p className="text-xs text-gray-500">
                                        Los precios definitivos son calculados y congelados por el servidor.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        agregarDetalle
                                    }
                                    className="rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
                                >
                                    + Agregar producto
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formulario.detalles.map(
                                    (
                                        detalle,
                                        indice
                                    ) => {
                                        const presentacion =
                                            obtenerPresentacion(
                                                detalle.id_producto_presentacion
                                            );

                                        const personalizable =
                                            Boolean(
                                                presentacion
                                                    ?.permite_personalizacion
                                            );

                                        const subtotal =
                                            calcularSubtotalDetalle(
                                                detalle
                                            );

                                        return (
                                            <div
                                                key={
                                                    detalle.uid
                                                }
                                                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <h4 className="text-sm font-semibold text-gray-700">
                                                        Línea{' '}
                                                        {indice +
                                                            1}
                                                    </h4>

                                                    {formulario
                                                        .detalles
                                                        .length >
                                                        1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                eliminarDetalle(
                                                                    indice
                                                                )
                                                            }
                                                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                                                    {/* Presentación */}
                                                    <div className="lg:col-span-2">
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            Producto / Presentación
                                                        </label>

                                                        <select
                                                            value={
                                                                detalle.id_producto_presentacion
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                cambiarDetalle(
                                                                    indice,
                                                                    'id_producto_presentacion',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            required
                                                            disabled={
                                                                cargandoCatalogos
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                                        >
                                                            <option value="">
                                                                Seleccione...
                                                            </option>

                                                            {presentaciones.map(
                                                                (
                                                                    item
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            item.id_producto_presentacion
                                                                        }
                                                                        value={
                                                                            item.id_producto_presentacion
                                                                        }
                                                                    >
                                                                        {obtenerNombrePresentacion(
                                                                            item
                                                                        )}{' '}
                                                                        - Bs{' '}
                                                                        {normalizarNumero(
                                                                            item.precio
                                                                        ).toFixed(
                                                                            2
                                                                        )}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>

                                                        {presentacion && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {personalizable
                                                                    ? 'Esta presentación permite personalización.'
                                                                    : 'Esta presentación no permite personalización.'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Cantidad */}
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            Cantidad
                                                        </label>

                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={
                                                                detalle.cantidad
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                cambiarDetalle(
                                                                    indice,
                                                                    'cantidad',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            required
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                                        />
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            Subtotal estimado
                                                        </label>

                                                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900">
                                                            Bs{' '}
                                                            {subtotal.toFixed(
                                                                2
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Personalización */}
                                                {personalizable && (
                                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                                        <div className="md:col-span-2">
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                Detalle de personalización
                                                            </label>

                                                            <input
                                                                type="text"
                                                                value={
                                                                    detalle.detalle_personalizacion
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    cambiarDetalle(
                                                                        indice,
                                                                        'detalle_personalizacion',
                                                                        e
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                maxLength={
                                                                    500
                                                                }
                                                                placeholder="Ej. Mensaje: Feliz cumpleaños María"
                                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                Costo adicional (Bs)
                                                            </label>

                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={
                                                                    detalle.costo_personalizacion
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    cambiarDetalle(
                                                                        indice,
                                                                        'costo_personalizacion',
                                                                        e
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                placeholder="0.00"
                                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </section>

                        {/* Observaciones */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <label className="mb-2 block font-semibold text-gray-900">
                                Observaciones
                            </label>

                            <textarea
                                name="observaciones"
                                value={
                                    formulario.observaciones
                                }
                                onChange={
                                    manejarCambioFormulario
                                }
                                rows="3"
                                maxLength={
                                    1000
                                }
                                placeholder="Indicaciones adicionales del pedido..."
                                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                            />
                        </section>

                        {/* Total */}
                        <section className="rounded-xl border border-pink-200 bg-pink-50 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-pink-800">
                                        Total estimado
                                    </p>

                                    <p className="text-xs text-pink-700">
                                        Laravel calculará y guardará el total definitivo.
                                    </p>
                                </div>

                                <p className="text-2xl font-bold text-pink-700">
                                    Bs{' '}
                                    {totalVistaPrevia.toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
                        <button
                            type="button"
                            onClick={
                                manejarCerrar
                            }
                            disabled={
                                guardando
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                guardando ||
                                cargandoCatalogos
                            }
                            className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {guardando
                                ? 'Guardando...'
                                : pedidoEditando
                                ? 'Guardar Cambios'
                                : 'Registrar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PedidoModal;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="pedido-form-titulo" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-theme-surface shadow-xl sm:max-h-[calc(100dvh-2rem)]">

                {/* Encabezado */}
                <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-4 py-4 sm:px-6">
                    <div>
                        <h2 id="pedido-form-titulo" className="text-xl font-semibold tracking-tight text-theme-heading sm:text-2xl">
                            {pedidoEditando
                                ? `Editar Pedido #${pedidoEditando.id_pedido}`
                                : 'Nuevo Pedido'}
                        </h2>

                        <p className="mt-1 text-sm text-theme-muted">
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
                        aria-label="Cerrar"
                        className="rounded-lg px-2 py-1 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Contenido */}
                <form
                    onSubmit={
                        manejarSubmit
                    }
                    className="min-h-0 overflow-y-auto"
                >
                    <div className="space-y-7 p-4 sm:p-6">

                        {/* Error */}
                        {error && (
                            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        {cargandoCatalogos && (
                            <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                Cargando clientes y presentaciones...
                            </div>
                        )}

                        {/* Cliente */}
                        <section className="border-b border-theme-border-subtle pb-7">
                            <h3 className="mb-4 text-base font-semibold text-theme-heading">
                                Cliente
                            </h3>

                            <div className="mb-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        cambiarTipoCliente(
                                            'REGISTRADO'
                                        )
                                    }
                                    aria-pressed={formulario.tipo_cliente === 'REGISTRADO'}
                                    className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                                        formulario.tipo_cliente ===
                                        'REGISTRADO'
                                            ? 'bg-pink-600 text-white'
                                            : 'border border-theme-border-subtle bg-theme-surface text-theme-body hover:bg-theme-hover'
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
                                    aria-pressed={formulario.tipo_cliente === 'OCASIONAL'}
                                    className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                                        formulario.tipo_cliente ===
                                        'OCASIONAL'
                                            ? 'bg-pink-600 text-white'
                                            : 'border border-theme-border-subtle bg-theme-surface text-theme-body hover:bg-theme-hover'
                                    }`}
                                >
                                    Cliente ocasional
                                </button>
                            </div>

                            {formulario.tipo_cliente ===
                            'REGISTRADO' ? (
                                <div>
                                    <label htmlFor="pedido-id-cliente" className="mb-1.5 block text-sm font-medium text-theme-body">
                                        Cliente
                                    </label>

                                    <select
                                        id="pedido-id-cliente"
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
                                        className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
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
                                    <label htmlFor="pedido-cliente-ocasional" className="mb-1.5 block text-sm font-medium text-theme-body">
                                        Nombre del cliente ocasional
                                    </label>

                                    <input
                                        id="pedido-cliente-ocasional"
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
                                        className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Entrega */}
                        <section className="border-b border-theme-border-subtle pb-7">
                            <h3 className="mb-4 text-base font-semibold text-theme-heading">
                                Fecha y hora de entrega
                            </h3>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="pedido-fecha-entrega" className="mb-1.5 block text-sm font-medium text-theme-body">
                                        Fecha de entrega
                                    </label>

                                    <input
                                        id="pedido-fecha-entrega"
                                        type="date"
                                        name="fecha_entrega"
                                        value={
                                            formulario.fecha_entrega
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="pedido-hora-entrega" className="mb-1.5 block text-sm font-medium text-theme-body">
                                        Hora de entrega
                                    </label>

                                    <input
                                        id="pedido-hora-entrega"
                                        type="time"
                                        name="hora_entrega"
                                        value={
                                            formulario.hora_entrega
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        required
                                        className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Productos */}
                        <section className="border-b border-theme-border-subtle pb-7">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-theme-heading">
                                        Productos del pedido
                                    </h3>

                                    <p className="mt-1 text-sm text-theme-muted">
                                        Los precios definitivos son calculados y congelados por el servidor.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        agregarDetalle
                                    }
                                    className="min-h-10 rounded-lg border border-pink-300 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                >
                                    Agregar producto
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
                                                className="rounded-xl bg-theme-subtle p-4 sm:p-5"
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <h4 className="text-sm font-semibold text-theme-heading">
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
                                                            className="rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                                                    {/* Presentación */}
                                                    <div className="lg:col-span-2">
                                                        <label htmlFor={`pedido-producto-${detalle.uid}`} className="mb-1.5 block text-sm font-medium text-theme-body">
                                                            Producto / Presentación
                                                        </label>

                                                        <select
                                                            id={`pedido-producto-${detalle.uid}`}
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
                                                            className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
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
                                                            <p className="mt-1.5 text-xs text-theme-muted">
                                                                {personalizable
                                                                    ? 'Esta presentación permite personalización.'
                                                                    : 'Esta presentación no permite personalización.'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Cantidad */}
                                                    <div>
                                                        <label htmlFor={`pedido-cantidad-${detalle.uid}`} className="mb-1.5 block text-sm font-medium text-theme-body">
                                                            Cantidad
                                                        </label>

                                                        <input
                                                            id={`pedido-cantidad-${detalle.uid}`}
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
                                                            className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                                        />
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div>
                                                        <p className="mb-1.5 block text-sm font-medium text-theme-body">
                                                            Subtotal estimado
                                                        </p>

                                                        <div className="min-h-11 rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm font-semibold tabular-nums text-theme-heading">
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
                                                            <label htmlFor={`pedido-personalizacion-${detalle.uid}`} className="mb-1.5 block text-sm font-medium text-theme-body">
                                                                Detalle de personalización
                                                            </label>

                                                            <input
                                                                id={`pedido-personalizacion-${detalle.uid}`}
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
                                                                className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label htmlFor={`pedido-costo-${detalle.uid}`} className="mb-1.5 block text-sm font-medium text-theme-body">
                                                                Costo adicional (Bs)
                                                            </label>

                                                            <input
                                                                id={`pedido-costo-${detalle.uid}`}
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
                                                                className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
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
                        <section>
                            <label htmlFor="pedido-observaciones" className="mb-2 block text-base font-semibold text-theme-heading">
                                Observaciones
                            </label>

                            <textarea
                                id="pedido-observaciones"
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
                                className="w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                            />
                        </section>

                        {/* Total */}
                        <section className="rounded-xl border border-pink-200 bg-pink-50 p-4 sm:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-pink-800">
                                        Total estimado
                                    </p>

                                    <p className="text-sm text-pink-800">
                                        El total definitivo se calculará al guardar el pedido.
                                    </p>
                                </div>

                                <p className="text-2xl font-semibold tabular-nums text-pink-900">
                                    Bs{' '}
                                    {totalVistaPrevia.toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-theme-border-subtle bg-theme-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <button
                            type="button"
                            onClick={
                                manejarCerrar
                            }
                            disabled={
                                guardando
                            }
                            className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                guardando ||
                                cargandoCatalogos
                            }
                            className="min-h-11 rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
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

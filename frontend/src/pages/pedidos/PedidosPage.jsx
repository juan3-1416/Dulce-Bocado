import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    listarPedidos,
    obtenerPedido,
    cambiarEstadoPedido
} from '../../services/pedidoService.js';

import PedidoModal from './PedidoModal.jsx';
import PedidoDetalleModal from './PedidoDetalleModal.jsx';
import CancelarPedidoModal from './CancelarPedidoModal.jsx';
import PagoModal from '../pagos/PagoModal';
import { consultarPagosOrigen } from '../../services/pagoService';
import { useAuth } from '../../context/AuthContext';
import './pedidos.css';

function PedidosPage() {
    const { tienePermiso } = useAuth();

    const puedeGestionarEstado =
        tienePermiso(
            'pedidos.gestionar_estado_entrega'
        );
    const puedeCrearPago = tienePermiso('pagos.crear');

    const [pedidoParaEntregar, setPedidoParaEntregar] = useState(null);
    const [cobroParaEntrega, setCobroParaEntrega] = useState(false);
    const [verificandoEntrega, setVerificandoEntrega] = useState(false);

    const [pedidos, setPedidos] =
        useState([]);

    const [cargando, setCargando] =
        useState(true);

    const [error, setError] =
        useState('');
    const [mensajeExito, setMensajeExito] =
        useState('');

    const [filtros, setFiltros] =
        useState({
            buscar: '',
            estado: '',
            fecha_entrega: ''
        });

    /*
    |--------------------------------------------------------------------------
    | Modal pago / anticipo
    |--------------------------------------------------------------------------
    */
    const [
        modalPagoAbierto,
        setModalPagoAbierto
    ] = useState(false);

    const [
        pedidoParaPagar,
        setPedidoParaPagar
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Modal nuevo / editar
    |--------------------------------------------------------------------------
    */

    const [
        modalPedidoAbierto,
        setModalPedidoAbierto
    ] = useState(false);

    const [
        pedidoEditando,
        setPedidoEditando
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Modal detalle
    |--------------------------------------------------------------------------
    */

    const [
        modalDetalleAbierto,
        setModalDetalleAbierto
    ] = useState(false);

    const [
        pedidoDetalle,
        setPedidoDetalle
    ] = useState(null);

    const [
        cargandoDetalle,
        setCargandoDetalle
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Modal cancelar y estado
    |--------------------------------------------------------------------------
    */

    const [
        modalCancelarAbierto,
        setModalCancelarAbierto
    ] = useState(false);

    const [
        pedidoParaCancelar,
        setPedidoParaCancelar
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Cargar pedidos
    |--------------------------------------------------------------------------
    */

    const cargarPedidos =
        useCallback(async () => {
            try {
                setCargando(true);
                setError('');

                const respuesta =
                    await listarPedidos(
                        filtros
                    );

                setPedidos(
                    respuesta.pedidos ?? []
                );
            } catch (err) {
                setError(
                    err.message ||
                    'Error al cargar los pedidos.'
                );
            } finally {
                setCargando(false);
            }
        }, [filtros]);

    useEffect(() => {
        cargarPedidos();
    }, [cargarPedidos]);

    /*
    |--------------------------------------------------------------------------
    | Filtros
    |--------------------------------------------------------------------------
    */

    const manejarCambioFiltro = (
        e
    ) => {
        const {
            name,
            value
        } = e.target;

        setFiltros(
            (prev) => ({
                ...prev,
                [name]: value
            })
        );
    };

    const limpiarFiltros = () => {
        setFiltros({
            buscar: '',
            estado: '',
            fecha_entrega: ''
        });
    };

    /*
    |--------------------------------------------------------------------------
    | Utilidades
    |--------------------------------------------------------------------------
    */

    const formatearFecha = (
        fecha
    ) => {
        if (!fecha) {
            return '—';
        }

        const soloFecha =
            String(fecha).split('T')[0];

        const partes =
            soloFecha.split('-');

        if (partes.length !== 3) {
            return soloFecha;
        }

        const [
            anio,
            mes,
            dia
        ] = partes;

        return `${dia}/${mes}/${anio}`;
    };

    const formatearHora = (
        hora
    ) => {
        if (!hora) {
            return '—';
        }

        return String(hora).slice(
            0,
            5
        );
    };

    const formatearMonto = (
        valor
    ) => {
        const numero =
            Number.parseFloat(valor);

        if (
            !Number.isFinite(numero)
        ) {
            return '0.00';
        }

        return numero.toFixed(2);
    };

    const obtenerNombreCliente = (
        pedido
    ) => {
        if (pedido.cliente) {
            return [
                pedido.cliente.nombre,
                pedido.cliente.apellido
            ]
                .filter(Boolean)
                .join(' ');
        }

        return (
            pedido
                .nombre_cliente_ocasional ||
            'Cliente ocasional'
        );
    };

    const obtenerClaseEstado = (
        estado
    ) => {
        switch (estado) {
            case 'PROGRAMADO':
                return (
                    'bg-blue-100 ' +
                    'text-blue-700'
                );

            case 'EN_PROCESO':
                return (
                    'bg-yellow-100 ' +
                    'text-yellow-700'
                );

            case 'ENTREGADO':
                return (
                    'bg-green-100 ' +
                    'text-green-700'
                );

            case 'CANCELADO':
                return (
                    'bg-red-100 ' +
                    'text-red-700'
                );

            default:
                return (
                    'bg-theme-subtle ' +
                    'text-theme-body'
                );
        }
    };

    const obtenerTextoEstado = (
        estado
    ) => {
        switch (estado) {
            case 'PROGRAMADO':
                return 'Programado';

            case 'EN_PROCESO':
                return 'En proceso';

            case 'ENTREGADO':
                return 'Entregado';

            case 'CANCELADO':
                return 'Cancelado';

            default:
                return estado;
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Nuevo pedido
    |--------------------------------------------------------------------------
    */

    const abrirNuevoPedido = () => {
        setPedidoEditando(null);
        setModalPedidoAbierto(true);
    };

    /*
    |--------------------------------------------------------------------------
    | Editar
    |--------------------------------------------------------------------------
    */

    const abrirEditarPedido =
        async (pedido) => {
            if (
                pedido.estado !==
                'PROGRAMADO'
            ) {
                window.alert(
                    'Solo se pueden modificar pedidos en estado PROGRAMADO.'
                );

                return;
            }

            try {
                setError('');

                const respuesta =
                    await obtenerPedido(
                        pedido.id_pedido
                    );

                setPedidoEditando(
                    respuesta.pedido
                );

                setModalPedidoAbierto(
                    true
                );
            } catch (err) {
                setError(
                    err.message ||
                    'No se pudo cargar el pedido para editar.'
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Ver detalle
    |--------------------------------------------------------------------------
    */

    const abrirDetallePedido =
        async (pedido) => {
            try {
                setCargandoDetalle(true);
                setError('');

                const respuesta =
                    await obtenerPedido(
                        pedido.id_pedido
                    );

                setPedidoDetalle(
                    respuesta.pedido
                );

                setModalDetalleAbierto(
                    true
                );
            } catch (err) {
                setError(
                    err.message ||
                    'No se pudo cargar el detalle del pedido.'
                );
            } finally {
                setCargandoDetalle(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Modificar Estado
    |--------------------------------------------------------------------------
    */

    const importeEnCentavos = (valor) => {
        if (valor == null || !/^\d+(?:\.\d{1,2})?$/.test(String(valor))) {
            return null;
        }

        const centavos = Math.round(Number(valor) * 100);

        return Number.isSafeInteger(centavos) ? centavos : null;
    };

    const consultarEstadoPagoEntrega = async (pedido) => {
        const resumen = await consultarPagosOrigen(
            'PEDIDO',
            pedido.id_pedido
        );

        const total = importeEnCentavos(resumen.total);
        const pagado = importeEnCentavos(resumen.pagado);
        const saldo = importeEnCentavos(resumen.saldo);

        if (
            total === null ||
            pagado === null ||
            saldo === null ||
            total <= 0 ||
            pagado > total ||
            total - pagado !== saldo
        ) {
            throw new Error(
                'No se pudo verificar el saldo real del pedido.'
            );
        }

        return {
            resumen,
            pagadoCompleto: pagado === total && saldo === 0,
        };
    };

    const iniciarEntrega = async (pedido) => {
        if (!puedeGestionarEstado || verificandoEntrega) return;

        setError('');
        setMensajeExito('');
        setVerificandoEntrega(true);

        try {
            const { resumen, pagadoCompleto } =
                await consultarEstadoPagoEntrega(pedido);

            if (pagadoCompleto) {
                await finalizarEntrega(pedido);
                return;
            }

            if (!puedeCrearPago) {
                setError(
                    'El pedido tiene saldo pendiente. Un usuario autorizado debe registrar el cobro antes de entregarlo.'
                );
                return;
            }

            setPedidoParaEntregar(pedido);
            setCobroParaEntrega(true);

            setPedidoParaPagar({
                ...pedido,
                total: resumen.total,
                total_pagado: resumen.pagado,
                saldo: resumen.saldo,
            });

            setModalPagoAbierto(true);
        } catch (err) {
            setError(
                err.message ||
                'No se pudo verificar el pago del pedido.'
            );
        } finally {
            setVerificandoEntrega(false);
        }
    };

    const finalizarEntrega = async (pedido) => {
        if (!pedido || !puedeGestionarEstado) {
            throw new Error('No tiene permiso para entregar el pedido.');
        }

        const { pagadoCompleto } =
            await consultarEstadoPagoEntrega(pedido);

        if (!pagadoCompleto) {
            throw new Error(
                'No se puede entregar el pedido porque tiene saldo pendiente.'
            );
        }

        await cambiarEstadoPedido(
            pedido.id_pedido,
            { estado: 'ENTREGADO' }
        );

        setPedidoParaEntregar(null);

        await cargarPedidos();

        setMensajeExito(
            'Pedido entregado correctamente. Pago completo verificado.'
        );
    };

    const manejarCambioEstado = async (pedido, nuevoEstado) => {
        if (nuevoEstado === 'ENTREGADO') {
            return iniciarEntrega(pedido);
        }

        const id_pedido =
            typeof pedido === 'object'
                ? pedido.id_pedido
                : pedido;

        try {
            setError('');
            setCargando(true);

            await cambiarEstadoPedido(
                id_pedido,
                { estado: nuevoEstado }
            );

            await cargarPedidos();
        } catch (err) {
            setError(
                err.message ||
                'Error al cambiar el estado del pedido.'
            );
        } finally {
            setCargando(false);
        }
    };

    const abrirCancelarPedido = (pedido) => {
        setPedidoParaCancelar(pedido);
        setModalCancelarAbierto(true);
    };

    const confirmarCancelacion = async (id_pedido, motivo_cancelacion) => {
        await cambiarEstadoPedido(id_pedido, { 
            estado: 'CANCELADO',
            motivo_cancelacion
        });
        await cargarPedidos();
    };

    /*
    |--------------------------------------------------------------------------
    | Pedido guardado
    |--------------------------------------------------------------------------
    */

    const manejarPedidoGuardado =
        async () => {
            await cargarPedidos();
        };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <section className="min-w-0 space-y-6 pb-10 text-theme-body">

            {/* Encabezado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
                        Pedidos
                    </h1>

                    <p className="mt-2 text-sm text-theme-muted">
                        Registra y consulta
                        pedidos programados de
                        clientes.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        abrirNuevoPedido
                    }
                    className="min-h-11 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                >
                    Nuevo pedido
                </button>
            </div>

            {/* Mensajes */}
            {mensajeExito && (
                <div role="status" className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <span>{mensajeExito}</span>
                    <button
                        type="button"
                        onClick={() => setMensajeExito('')}
                        aria-label="Cerrar mensaje"
                        className="rounded-lg px-2 py-1 text-green-800 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="rounded-xl border border-theme-border-subtle bg-theme-surface p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">

                    {/* Buscar */}
                    <div>
                        <label htmlFor="pedidos-buscar" className="mb-1.5 block text-sm font-medium text-theme-body">
                            Buscar
                        </label>

                        <input
                            id="pedidos-buscar"
                            type="text"
                            name="buscar"
                            placeholder="Cliente, CI/NIT o N.º pedido..."
                            value={
                                filtros.buscar
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label htmlFor="pedidos-estado" className="mb-1.5 block text-sm font-medium text-theme-body">
                            Estado
                        </label>

                        <select
                            id="pedidos-estado"
                            name="estado"
                            value={
                                filtros.estado
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        >
                            <option value="">
                                Todos los estados
                            </option>

                            <option value="PROGRAMADO">
                                Programado
                            </option>

                            <option value="EN_PROCESO">
                                En proceso
                            </option>

                            <option value="ENTREGADO">
                                Entregado
                            </option>

                            <option value="CANCELADO">
                                Cancelado
                            </option>
                        </select>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label htmlFor="pedidos-fecha" className="mb-1.5 block text-sm font-medium text-theme-body">
                            Fecha de entrega
                        </label>

                        <input
                            id="pedidos-fecha"
                            type="date"
                            name="fecha_entrega"
                            value={
                                filtros.fecha_entrega
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        />
                    </div>

                    {/* Limpiar */}
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={
                                limpiarFiltros
                            }
                            className="min-h-11 w-full whitespace-nowrap rounded-lg border border-theme-border-subtle bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-border-subtle sm:grid-cols-4">
                <div className="bg-theme-surface p-4 sm:p-5">
                    <p className="text-sm text-theme-muted">
                        Resultados
                    </p>

                    <p className="mt-1 text-2xl font-semibold tabular-nums text-theme-heading">
                        {pedidos.length}
                    </p>
                </div>

                <div className="bg-theme-surface p-4 sm:p-5">
                    <p className="text-sm text-theme-muted">
                        Programados
                    </p>

                    <p className="mt-1 text-2xl font-semibold tabular-nums text-theme-heading">
                        {
                            pedidos.filter(
                                (pedido) =>
                                    pedido.estado ===
                                    'PROGRAMADO'
                            ).length
                        }
                    </p>
                </div>

                <div className="bg-theme-surface p-4 sm:p-5">
                    <p className="text-sm text-theme-muted">
                        En proceso
                    </p>

                    <p className="mt-1 text-2xl font-semibold tabular-nums text-theme-heading">
                        {
                            pedidos.filter(
                                (pedido) =>
                                    pedido.estado ===
                                    'EN_PROCESO'
                            ).length
                        }
                    </p>
                </div>

                <div className="bg-theme-surface p-4 sm:p-5">
                    <p className="text-sm text-theme-muted">
                        Entregados
                    </p>

                    <p className="mt-1 text-2xl font-semibold tabular-nums text-theme-heading">
                        {
                            pedidos.filter(
                                (pedido) =>
                                    pedido.estado ===
                                    'ENTREGADO'
                            ).length
                        }
                    </p>
                </div>
            </div>

            {/* Tabla */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">

                {cargando ? (
                    <div role="status" className="p-8 text-center text-theme-muted">
                        Cargando pedidos...
                    </div>
                ) : (
                    <div className="min-w-0">
                        <table className="pedidos-table w-full divide-y divide-theme-border-subtle" aria-label="Listado de pedidos">

                            <thead className="bg-theme-subtle">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                                        Pedido
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                                        Cliente
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                                        Entrega
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-theme-muted">
                                        Productos
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-theme-muted">
                                        Total
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-theme-muted">
                                        Estado
                                    </th>

                                    <th className="w-[260px] min-w-[260px] px-4 py-3 text-right text-xs font-semibold text-theme-muted">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-theme-border-subtle">
                                {pedidos.map(
                                    (pedido) => (
                                        <tr
                                            key={
                                                pedido.id_pedido
                                            }
                                            className="hover:bg-theme-subtle"
                                        >
                                            {/* Número */}
                                            <td data-label="Pedido" className="px-5 py-4">
                                                <p className="font-semibold tabular-nums text-theme-heading">
                                                    #
                                                    {
                                                        pedido.id_pedido
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-theme-muted">
                                                    {formatearFecha(
                                                        pedido.fecha_pedido
                                                    )}
                                                </p>
                                            </td>

                                            {/* Cliente */}
                                            <td data-label="Cliente" className="px-5 py-4">
                                                <p className="break-words text-sm font-medium text-theme-heading">
                                                    {obtenerNombreCliente(
                                                        pedido
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-theme-muted">
                                                    {pedido.id_cliente
                                                        ? 'Cliente registrado'
                                                        : 'Cliente ocasional'}
                                                </p>
                                            </td>

                                            {/* Entrega */}
                                            <td data-label="Entrega" className="px-5 py-4">
                                                <p className="text-sm font-medium text-theme-heading">
                                                    {formatearFecha(
                                                        pedido.fecha_entrega
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-theme-muted">
                                                    {formatearHora(
                                                        pedido.hora_entrega
                                                    )}
                                                </p>
                                            </td>

                                            {/* Detalles */}
                                            <td data-label="Productos" className="px-5 py-4 text-center">
                                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                                    {
                                                        pedido
                                                            .detalles
                                                            ?.length ??
                                                        0
                                                    }{' '}
                                                    {pedido
                                                        .detalles
                                                        ?.length ===
                                                    1
                                                        ? 'línea'
                                                        : 'líneas'}
                                                </span>
                                            </td>

                                            {/* Total */}
                                            <td data-label="Total" className="px-5 py-4 text-right">
                                                <p className="font-semibold tabular-nums text-theme-heading">
                                                    Bs {formatearMonto(pedido.total)}
                                                </p>
                                            </td>

                                            {/* Estado */}
                                            <td data-label="Estado" className="px-5 py-4 text-center">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(
                                                        pedido.estado
                                                    )}`}
                                                >
                                                    {obtenerTextoEstado(
                                                        pedido.estado
                                                    )}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td data-label="Acciones" className="pedidos-actions px-4 py-4 text-right align-top md:w-[260px]">
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirDetallePedido(
                                                                    pedido
                                                                )
                                                            }
                                                            disabled={
                                                                cargandoDetalle
                                                            }
                                                            className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                                                        >
                                                            Ver detalle
                                                        </button>

                                                        {puedeCrearPago && !['CANCELADO', 'ENTREGADO'].includes(pedido.estado) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCobroParaEntrega(false);
                                                                    setPedidoParaEntregar(null);
                                                                    setPedidoParaPagar(pedido);
                                                                    setModalPagoAbierto(true);
                                                                }}
                                                                className="min-h-10 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-800 hover:bg-pink-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                                            >
                                                                Cobrar / Anticipo
                                                            </button>
                                                        )}

                                                        {puedeGestionarEstado && pedido.estado === 'PROGRAMADO' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    abrirEditarPedido(
                                                                        pedido
                                                                    )
                                                                }
                                                                className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                                            >
                                                                Editar
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="mt-1 flex max-w-[260px] flex-wrap justify-end gap-2">
                                                        {puedeGestionarEstado && pedido.estado === 'PROGRAMADO' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => manejarCambioEstado(pedido, 'EN_PROCESO')}
                                                                    className="min-h-10 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-900 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-700"
                                                                >
                                                                    Iniciar preparación
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => manejarCambioEstado(pedido, 'ENTREGADO')}
                                                                    className="min-h-10 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                                                >
                                                                    Entregar pedido
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => abrirCancelarPedido(pedido)}
                                                                    className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}

                                                        {puedeGestionarEstado && pedido.estado === 'EN_PROCESO' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => manejarCambioEstado(pedido, 'ENTREGADO')}
                                                                    className="min-h-10 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                                                >
                                                                    Entregar pedido
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => abrirCancelarPedido(pedido)}
                                                                    className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}

                                {pedidos.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="px-5 py-10 text-center text-sm text-theme-muted"
                                        >
                                            No se encontraron
                                            pedidos con los
                                            filtros
                                            seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal crear / editar */}
            <PedidoModal
                isOpen={
                    modalPedidoAbierto
                }
                onClose={() => {
                    setModalPedidoAbierto(
                        false
                    );

                    setPedidoEditando(
                        null
                    );
                }}
                pedidoEditando={
                    pedidoEditando
                }
                onSaved={
                    manejarPedidoGuardado
                }
            />

            {/* Modal detalle */}
            <PedidoDetalleModal
                isOpen={
                    modalDetalleAbierto
                }
                onClose={() => {
                    setModalDetalleAbierto(
                        false
                    );

                    setPedidoDetalle(
                        null
                    );
                }}
                pedido={
                    pedidoDetalle
                }
                onPagoRegistrado={(msg) => {
                    setMensajeExito(msg);
                    void cargarPedidos();
                }}
            />

            {/* Modal de cancelación */}
            <CancelarPedidoModal
                isOpen={modalCancelarAbierto}
                onClose={() => {
                    setModalCancelarAbierto(false);
                    setPedidoParaCancelar(null);
                }}
                pedido={pedidoParaCancelar}
                onConfirm={confirmarCancelacion}
            />

            {/* Modal registrar cobro / anticipo */}
            {modalPagoAbierto && (
                <PagoModal
                    abierto={modalPagoAbierto}
                    onCerrar={() => {
                        setModalPagoAbierto(false);
                        setPedidoParaPagar(null);
                        setCobroParaEntrega(false);
                        setPedidoParaEntregar(null);
                    }}
                    onGuardado={async (msg) => {
                        const pedidoEntrega = cobroParaEntrega
                            ? pedidoParaEntregar
                            : null;

                        setModalPagoAbierto(false);
                        setPedidoParaPagar(null);
                        setCobroParaEntrega(false);
                        setPedidoParaEntregar(null);
                        setError('');
                        setMensajeExito(msg);

                        if (!pedidoEntrega) {
                            await cargarPedidos();
                            return;
                        }

                        setVerificandoEntrega(true);

                        try {
                            const { pagadoCompleto } =
                                await consultarEstadoPagoEntrega(pedidoEntrega);

                            if (pagadoCompleto) {
                                await finalizarEntrega(pedidoEntrega);
                            } else {
                                await cargarPedidos();

                                setMensajeExito(
                                    'Pago parcial registrado. El pedido todavia tiene saldo pendiente y no puede entregarse.'
                                );
                            }
                        } catch (err) {
                            setError(
                                'Pago registrado, pero no se pudo completar la entrega. No vuelva a cobrar. ' +
                                (err.message || '')
                            );
                        } finally {
                            setVerificandoEntrega(false);
                        }
                    }}
                    pedidos={pedidoParaPagar ? [pedidoParaPagar] : []}
                    pedidoSeleccionadoInicial={pedidoParaPagar}
                />
            )}
        </section>
    );
}

export default PedidosPage;

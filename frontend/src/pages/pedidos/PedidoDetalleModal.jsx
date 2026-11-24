import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consultarPagosOrigen } from '../../services/pagoService';
import PagoModal from '../pagos/PagoModal';
import ReciboDetalleModal from '../recibos/ReciboDetalleModal';

function PedidoDetalleModal({
    isOpen,
    onClose,
    pedido,
    onPagoRegistrado,
}) {
    const { tienePermiso } = useAuth();
    const puedeCrearPago = tienePermiso('pagos.crear');

    const [resumenPagos, setResumenPagos] = useState(null);
    const [listaPagos, setListaPagos] = useState([]);
    const [cargandoPagos, setCargandoPagos] = useState(false);
    const [errorPagos, setErrorPagos] = useState('');

    const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
    const [reciboSeleccionado, setReciboSeleccionado] = useState(null);

    const cargarPagosPedido = useCallback(async () => {
        if (!pedido?.id_pedido) return;
        try {
            setCargandoPagos(true);
            setErrorPagos('');
            const data = await consultarPagosOrigen('PEDIDO', pedido.id_pedido);
            setResumenPagos({
                total: Number(data.total ?? 0),
                pagado: Number(data.pagado ?? 0),
                saldo: Number(data.saldo ?? 0),
                estado_origen: data.estado_origen,
                moneda: data.moneda || 'BOB',
            });
            setListaPagos(data.pagos ?? []);
        } catch (err) {
            // Si el pedido aún no tiene registros en payment-service
            setResumenPagos({
                total: Number(pedido.total ?? 0),
                pagado: 0,
                saldo: Number(pedido.total ?? 0),
                estado_origen: pedido.estado,
                moneda: 'BOB',
            });
            setListaPagos([]);
            if (err.status !== 404) {
                setErrorPagos(err.message || 'No se pudieron consultar los pagos del pedido.');
            }
        } finally {
            setCargandoPagos(false);
        }
    }, [pedido?.id_pedido, pedido?.total, pedido?.estado]);

    useEffect(() => {
        if (isOpen && pedido?.id_pedido) {
            void cargarPagosPedido();
        } else {
            setResumenPagos(null);
            setListaPagos([]);
            setErrorPagos('');
            setModalPagoAbierto(false);
            setReciboSeleccionado(null);
        }
    }, [isOpen, pedido?.id_pedido, cargarPagosPedido]);

    if (!isOpen || !pedido) {
        return null;
    }

    const formatearFecha = (fecha) => {
        if (!fecha) {
            return '—';
        }

        const soloFecha =
            String(fecha).split('T')[0];

        const [
            anio,
            mes,
            dia,
        ] = soloFecha.split('-');

        if (!anio || !mes || !dia) {
            return fecha;
        }

        return `${dia}/${mes}/${anio}`;
    };

    const formatearHora = (hora) => {
        if (!hora) {
            return '—';
        }

        return String(hora).slice(0, 5);
    };

    const formatearMonto = (valor) => {
        const numero =
            Number.parseFloat(valor);

        if (!Number.isFinite(numero)) {
            return '0.00';
        }

        return numero.toFixed(2);
    };

    const total = resumenPagos?.total ?? Number(pedido.total ?? 0);
    const pagado = resumenPagos?.pagado ?? 0;
    const saldo = resumenPagos?.saldo ?? total;
    const esPagadoTotal = saldo <= 0.001;
    const tieneAnticipo = pagado > 0 && !esPagadoTotal;

    const obtenerNombreCliente = () => {
        if (pedido.cliente) {
            const nombre =
                pedido.cliente.nombre ?? '';

            const apellido =
                pedido.cliente.apellido ?? '';

            return `${nombre} ${apellido}`
                .trim();
        }

        return (
            pedido.nombre_cliente_ocasional ||
            'Cliente ocasional'
        );
    };

    const obtenerNombreProducto = (
        detalle
    ) => {
        return (
            detalle
                ?.producto_presentacion
                ?.producto
                ?.nombre ??
            'Producto'
        );
    };

    const obtenerNombrePresentacion = (
        detalle
    ) => {
        return (
            detalle
                ?.producto_presentacion
                ?.presentacion
                ?.nombre ??
            'Presentación'
        );
    };

    const claseEstado = () => {
        switch (pedido.estado) {
            case 'PROGRAMADO':
                return 'bg-blue-100 text-blue-700';

            case 'EN_PROCESO':
                return 'bg-yellow-100 text-yellow-700';

            case 'ENTREGADO':
                return 'bg-green-100 text-green-700';

            case 'CANCELADO':
                return 'bg-red-100 text-red-700';

            default:
                return 'bg-theme-subtle text-theme-body';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="pedido-detalle-titulo" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-theme-surface shadow-xl sm:max-h-[calc(100dvh-2rem)]">

                {/* Encabezado */}
                <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-4 py-4 sm:px-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 id="pedido-detalle-titulo" className="text-xl font-semibold tracking-tight text-theme-heading sm:text-2xl">
                                Pedido #{pedido.id_pedido}
                            </h2>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${claseEstado()}`}
                            >
                                {pedido.estado}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-theme-muted">
                            Detalle completo del pedido registrado y gestión de cobros.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="rounded-lg px-2 py-1 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Contenido */}
                <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                    <div className="space-y-7">

                        {/* Datos generales */}
                        <section className="border-b border-theme-border-subtle pb-6">
                            <h3 className="mb-4 text-base font-semibold text-theme-heading">
                                Información general
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Cliente
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-theme-heading">
                                        {obtenerNombreCliente()}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Tipo de cliente
                                    </p>

                                    <p className="mt-1 text-sm text-theme-body">
                                        {pedido.id_cliente
                                            ? 'Registrado'
                                            : 'Ocasional'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Fecha del pedido
                                    </p>

                                    <p className="mt-1 text-sm text-theme-body">
                                        {formatearFecha(
                                            pedido.fecha_pedido
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Registrado por
                                    </p>

                                    <p className="mt-1 text-sm text-theme-body">
                                        {pedido.usuario?.nombre ??
                                            '—'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Entrega */}
                        <section className="border-b border-theme-border-subtle pb-6">
                            <h3 className="mb-4 text-base font-semibold text-theme-heading">
                                Entrega
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Fecha de entrega
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-theme-heading">
                                        {formatearFecha(
                                            pedido.fecha_entrega
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-theme-muted">
                                        Hora de entrega
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-theme-heading">
                                        {formatearHora(
                                            pedido.hora_entrega
                                        )}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Detalles */}
                        <section className="overflow-hidden rounded-xl border border-theme-border-subtle">
                            <div className="border-b border-theme-border-subtle px-4 py-4 sm:px-5">
                                <h3 className="font-semibold text-theme-heading">
                                    Productos del pedido
                                </h3>

                                <p className="mt-1 text-sm text-theme-muted">
                                    Se muestran los precios congelados almacenados al registrar o editar el pedido.
                                </p>
                            </div>

                            <div className="min-w-0">
                                <table className="pedido-detalle-table w-full divide-y divide-theme-border-subtle" aria-label="Productos del pedido">
                                    <thead className="bg-theme-subtle">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-theme-muted">
                                                Producto
                                            </th>

                                            <th className="px-4 py-3 text-left text-xs font-semibold text-theme-muted">
                                                Presentación
                                            </th>

                                            <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted">
                                                Cantidad
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold text-theme-muted">
                                                Precio congelado
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold text-theme-muted">
                                                Personalización
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold text-theme-muted">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-theme-border-subtle bg-theme-surface">
                                        {pedido.detalles?.map(
                                            (detalle) => (
                                                <tr
                                                    key={
                                                        detalle.id_detalle_pedido
                                                    }
                                                    className="hover:bg-theme-subtle"
                                                >
                                                    <td data-label="Producto" className="px-4 py-3 text-sm font-medium text-theme-heading">
                                                        {obtenerNombreProducto(
                                                            detalle
                                                        )}
                                                    </td>

                                                    <td data-label="Presentación" className="px-4 py-3 text-sm text-theme-body">
                                                        {obtenerNombrePresentacion(
                                                            detalle
                                                        )}
                                                    </td>

                                                    <td data-label="Cantidad" className="px-4 py-3 text-center text-sm text-theme-body">
                                                        {detalle.cantidad}
                                                    </td>

                                                    <td data-label="Precio congelado" className="px-4 py-3 text-right text-sm tabular-nums text-theme-body">
                                                        Bs{' '}
                                                        {formatearMonto(
                                                            detalle.precio_congelado
                                                        )}
                                                    </td>

                                                    <td data-label="Personalización" className="px-4 py-3 text-right text-sm tabular-nums text-theme-body">
                                                        Bs{' '}
                                                        {formatearMonto(
                                                            detalle.costo_personalizacion
                                                        )}
                                                    </td>

                                                    <td data-label="Subtotal" className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-theme-heading">
                                                        Bs{' '}
                                                        {formatearMonto(
                                                            detalle.subtotal
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}

                                        {(!pedido.detalles ||
                                            pedido.detalles.length ===
                                                0) && (
                                            <tr>
                                                <td
                                                    colSpan="6"
                                                    className="px-4 py-8 text-center text-sm text-theme-muted"
                                                >
                                                    El pedido no tiene detalles registrados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Personalizaciones */}
                        {pedido.detalles?.some(
                            (detalle) =>
                                detalle.detalle_personalizacion
                        ) && (
                            <section className="rounded-xl border border-purple-200 bg-purple-50 p-4 sm:p-5">
                                <h3 className="mb-4 font-semibold text-purple-900">
                                    Personalizaciones
                                </h3>

                                <div className="space-y-3">
                                    {pedido.detalles
                                        .filter(
                                            (detalle) =>
                                                detalle.detalle_personalizacion
                                        )
                                        .map(
                                            (
                                                detalle
                                            ) => (
                                                <div
                                                    key={
                                                        detalle.id_detalle_pedido
                                                    }
                                                    className="rounded-lg bg-theme-surface p-4"
                                                >
                                                    <p className="text-sm font-semibold text-theme-heading">
                                                        {obtenerNombreProducto(
                                                            detalle
                                                        )}{' '}
                                                        -{' '}
                                                        {obtenerNombrePresentacion(
                                                            detalle
                                                        )}
                                                    </p>

                                                    <p className="mt-1 text-sm text-theme-body">
                                                        {
                                                            detalle.detalle_personalizacion
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs font-medium text-purple-700">
                                                        Costo adicional: Bs{' '}
                                                        {formatearMonto(
                                                            detalle.costo_personalizacion
                                                        )}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                </div>
                            </section>
                        )}

                        {/* Observaciones */}
                        <section className="border-b border-theme-border-subtle pb-6">
                            <h3 className="mb-2 font-semibold text-theme-heading">
                                Observaciones
                            </h3>

                            <p className="whitespace-pre-wrap break-words text-sm text-theme-body">
                                {pedido.observaciones ||
                                    'Sin observaciones.'}
                            </p>
                        </section>

                        {/* Gestión de Cobros, Anticipos y Saldos (Option 1 / T413) */}
                        <section className="rounded-xl border border-theme-border-subtle bg-theme-subtle p-4 sm:p-5">
                            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-theme-heading">
                                        Pagos y anticipos
                                    </h3>
                                    <p className="mt-1 text-sm text-theme-muted">
                                        Cobros registrados para este pedido.
                                    </p>
                                </div>

                                {puedeCrearPago && pedido.estado !== 'CANCELADO' && !esPagadoTotal && (
                                    <button
                                        type="button"
                                        onClick={() => setModalPagoAbierto(true)}
                                        className="min-h-11 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                    >
                                        {tieneAnticipo ? 'Cobrar saldo pendiente' : 'Registrar anticipo o pago'}
                                    </button>
                                )}
                            </div>

                            {errorPagos && (
                                <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    {errorPagos}
                                </div>
                            )}

                            {/* Tarjetas de Resumen */}
                            <div className="grid gap-4 rounded-xl bg-theme-surface p-4 sm:grid-cols-3 sm:divide-x sm:divide-theme-border-subtle">
                                <div>
                                    <p className="text-sm text-theme-muted">
                                        Total del Pedido
                                    </p>
                                    <p className="mt-1 text-xl font-semibold tabular-nums text-theme-heading">
                                        Bs {formatearMonto(total)}
                                    </p>
                                </div>

                                <div className="sm:pl-4">
                                    <p className="text-sm text-theme-muted">
                                        Anticipo / Pagado
                                    </p>
                                    <p className="mt-1 text-xl font-semibold tabular-nums text-theme-heading">
                                        Bs {formatearMonto(pagado)}
                                    </p>
                                </div>

                                <div className="sm:pl-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-theme-muted">
                                            Saldo Pendiente
                                        </p>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            esPagadoTotal
                                                ? 'bg-green-100 text-green-800'
                                                : tieneAnticipo
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {esPagadoTotal
                                                ? 'PAGADO TOTAL'
                                                : tieneAnticipo
                                                    ? 'ANTICIPO PARCIAL'
                                                    : 'SIN ANTICIPO'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xl font-semibold tabular-nums text-theme-heading">
                                        Bs {formatearMonto(saldo)}
                                    </p>
                                </div>
                            </div>

                            {/* Historial de pagos / anticipos realizados */}
                            <div className="mt-5 overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
                                <div className="flex items-center justify-between gap-3 border-b border-theme-border-subtle bg-theme-subtle px-4 py-3">
                                    <h4 className="text-sm font-semibold text-theme-heading">
                                        Historial de pagos ({listaPagos.length})
                                    </h4>
                                    {cargandoPagos && (
                                        <span role="status" className="text-xs text-theme-muted">Actualizando...</span>
                                    )}
                                </div>

                                {listaPagos.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-theme-muted">
                                        No existen pagos o anticipos registrados para este pedido.
                                    </div>
                                ) : (
                                    <div className="min-w-0">
                                        <table className="pedido-detalle-table w-full divide-y divide-theme-border-subtle text-left text-sm" aria-label="Historial de pagos del pedido">
                                            <thead className="bg-theme-subtle text-theme-muted font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2.5">Fecha</th>
                                                    <th className="px-4 py-2.5">Medio</th>
                                                    <th className="px-4 py-2.5 text-right">Monto</th>
                                                    <th className="px-4 py-2.5">Referencia</th>
                                                    <th className="px-4 py-2.5 text-center">Estado</th>
                                                    <th className="px-4 py-2.5 text-center">Recibo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-theme-border-subtle">
                                                {listaPagos.map((pago) => (
                                                    <tr key={pago.id_pago} className="hover:bg-theme-subtle">
                                                        <td data-label="Fecha" className="px-4 py-2.5 text-theme-body">
                                                            {formatearFecha(pago.fecha)} {formatearHora(pago.fecha?.split('T')[1])}
                                                        </td>
                                                        <td data-label="Medio" className="px-4 py-2.5">
                                                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                                                pago.medio === 'QR'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                {pago.medio}
                                                            </span>
                                                        </td>
                                                        <td data-label="Monto" className="px-4 py-2.5 text-right font-semibold tabular-nums text-theme-heading">
                                                            Bs {formatearMonto(pago.monto)}
                                                        </td>
                                                        <td data-label="Referencia" className="break-all px-4 py-2.5 text-theme-body">
                                                            {pago.referencia || '—'}
                                                        </td>
                                                        <td data-label="Estado" className="px-4 py-2.5 text-center">
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                pago.estado === 'CONFIRMADO'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {pago.estado}
                                                            </span>
                                                        </td>
                                                        <td data-label="Recibo" className="px-4 py-2.5 text-center">
                                                            {pago.recibo || pago.id_pago ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setReciboSeleccionado(pago.recibo || pago.id_pago)}
                                                                    className="rounded text-sm font-semibold text-pink-700 underline underline-offset-2 hover:text-pink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                                                                >
                                                                    Ver recibo
                                                                </button>
                                                            ) : (
                                                                <span className="text-theme-muted">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Auditoría / Estado */}
                        <section className="border-t border-theme-border-subtle pt-6">
                            <h3 className="mb-4 text-base font-semibold text-theme-heading">
                                Historial del pedido
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {pedido.usuario_preparacion && (
                                    <div className="rounded-lg bg-theme-subtle p-4">
                                        <p className="text-xs font-semibold text-theme-muted">
                                            Preparado por
                                        </p>
                                        <p className="text-sm font-medium text-theme-heading">
                                            {pedido.usuario_preparacion.nombre ?? 'Usuario'}
                                        </p>
                                        <p className="text-xs text-theme-muted">
                                            {formatearFecha(pedido.fecha_preparacion)} {formatearHora(pedido.fecha_preparacion?.split('T')[1])}
                                        </p>
                                    </div>
                                )}

                                {pedido.usuario_entrega && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                        <p className="text-xs font-semibold text-green-700">
                                            Entregado por
                                        </p>
                                        <p className="text-sm font-medium text-theme-heading">
                                            {pedido.usuario_entrega.nombre ?? 'Usuario'}
                                        </p>
                                        <p className="text-xs text-theme-muted">
                                            {formatearFecha(pedido.fecha_entrega_efectiva)} {formatearHora(pedido.fecha_entrega_efectiva?.split('T')[1])}
                                        </p>
                                    </div>
                                )}

                                {pedido.estado === 'CANCELADO' && (
                                    <div className="col-span-full rounded-lg border border-red-200 bg-red-50 p-4">
                                        <p className="text-xs font-semibold text-red-700">
                                            Motivo de Cancelación
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-red-900">
                                            {pedido.motivo_cancelacion ?? 'Sin especificar'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-theme-border-subtle bg-theme-surface px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-lg border border-theme-border-subtle px-5 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Modal de cobro de anticipo o saldo */}
            {modalPagoAbierto && (
                <PagoModal
                    abierto={modalPagoAbierto}
                    onCerrar={() => setModalPagoAbierto(false)}
                    onGuardado={async (msg) => {
                        setModalPagoAbierto(false);
                        await cargarPagosPedido();
                        if (onPagoRegistrado) onPagoRegistrado(msg);
                    }}
                    pedidos={[pedido]}
                    pedidoSeleccionadoInicial={{
                        ...pedido,
                        saldo: resumenPagos?.saldo ?? pedido.total,
                        total: resumenPagos?.total ?? pedido.total,
                    }}
                />
            )}

            {/* Modal de visualización de recibo */}
            {reciboSeleccionado && (
                <ReciboDetalleModal
                    abierto={Boolean(reciboSeleccionado)}
                    reciboId={reciboSeleccionado?.id_recibo || reciboSeleccionado}
                    onCerrar={() => setReciboSeleccionado(null)}
                    onActualizado={cargarPagosPedido}
                />
            )}
        </div>
    );
}

export default PedidoDetalleModal;

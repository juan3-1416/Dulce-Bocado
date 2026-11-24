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
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">

                {/* Encabezado */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-900">
                                Pedido #{pedido.id_pedido}
                            </h2>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${claseEstado()}`}
                            >
                                {pedido.estado}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                            Detalle completo del pedido registrado y gestión de cobros.
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

                {/* Contenido */}
                <div className="overflow-y-auto p-6">
                    <div className="space-y-6">

                        {/* Datos generales */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                Información general
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Cliente
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-900">
                                        {obtenerNombreCliente()}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Tipo de cliente
                                    </p>

                                    <p className="mt-1 text-sm text-gray-700">
                                        {pedido.id_cliente
                                            ? 'Registrado'
                                            : 'Ocasional'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Fecha del pedido
                                    </p>

                                    <p className="mt-1 text-sm text-gray-700">
                                        {formatearFecha(
                                            pedido.fecha_pedido
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Registrado por
                                    </p>

                                    <p className="mt-1 text-sm text-gray-700">
                                        {pedido.usuario?.nombre ??
                                            '—'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Entrega */}
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                Entrega
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Fecha de entrega
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-900">
                                        {formatearFecha(
                                            pedido.fecha_entrega
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Hora de entrega
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-900">
                                        {formatearHora(
                                            pedido.hora_entrega
                                        )}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Detalles */}
                        <section className="rounded-xl border border-gray-200">
                            <div className="border-b px-5 py-4">
                                <h3 className="font-semibold text-gray-900">
                                    Productos del pedido
                                </h3>

                                <p className="mt-1 text-xs text-gray-500">
                                    Se muestran los precios congelados almacenados al registrar o editar el pedido.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                                Producto
                                            </th>

                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                                Presentación
                                            </th>

                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                                                Cantidad
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                                Precio congelado
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                                Personalización
                                            </th>

                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {pedido.detalles?.map(
                                            (detalle) => (
                                                <tr
                                                    key={
                                                        detalle.id_detalle_pedido
                                                    }
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {obtenerNombreProducto(
                                                            detalle
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {obtenerNombrePresentacion(
                                                            detalle
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                                                        {detalle.cantidad}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                        Bs{' '}
                                                        {formatearMonto(
                                                            detalle.precio_congelado
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                        Bs{' '}
                                                        {formatearMonto(
                                                            detalle.costo_personalizacion
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
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
                                                    className="px-4 py-8 text-center text-sm text-gray-500"
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
                            <section className="rounded-xl border border-purple-200 bg-purple-50 p-5">
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
                                                    className="rounded-lg border border-purple-200 bg-white p-3"
                                                >
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {obtenerNombreProducto(
                                                            detalle
                                                        )}{' '}
                                                        -{' '}
                                                        {obtenerNombrePresentacion(
                                                            detalle
                                                        )}
                                                    </p>

                                                    <p className="mt-1 text-sm text-gray-700">
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
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-2 font-semibold text-gray-900">
                                Observaciones
                            </h3>

                            <p className="whitespace-pre-wrap text-sm text-gray-700">
                                {pedido.observaciones ||
                                    'Sin observaciones.'}
                            </p>
                        </section>

                        {/* Gestión de Cobros, Anticipos y Saldos (Option 1 / T413) */}
                        <section className="rounded-xl border border-pink-200 bg-pink-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="font-semibold text-pink-900 text-base">
                                        Estado de Pagos y Anticipos
                                    </h3>
                                    <p className="text-xs text-pink-700">
                                        Información de cobros y anticipos registrada en Payment Service.
                                    </p>
                                </div>

                                {puedeCrearPago && pedido.estado !== 'CANCELADO' && !esPagadoTotal && (
                                    <button
                                        type="button"
                                        onClick={() => setModalPagoAbierto(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pink-700 transition"
                                    >
                                        <span>💳</span>
                                        {tieneAnticipo ? 'Cobrar Saldo Pendiente' : 'Registrar Anticipo / Pago'}
                                    </button>
                                )}
                            </div>

                            {errorPagos && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                    {errorPagos}
                                </div>
                            )}

                            {/* Tarjetas de Resumen */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border border-pink-100 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Total del Pedido
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900">
                                        Bs {formatearMonto(total)}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase text-green-700">
                                        Anticipo / Pagado
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-green-700">
                                        Bs {formatearMonto(pagado)}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase text-amber-700">
                                            Saldo Pendiente
                                        </p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                                    <p className="mt-1 text-2xl font-bold text-amber-800">
                                        Bs {formatearMonto(saldo)}
                                    </p>
                                </div>
                            </div>

                            {/* Historial de pagos / anticipos realizados */}
                            <div className="mt-5 rounded-lg border border-gray-200 bg-white overflow-hidden">
                                <div className="border-b px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Historial de Pagos Registrados ({listaPagos.length})
                                    </h4>
                                    {cargandoPagos && (
                                        <span className="text-xs text-gray-400">Actualizando...</span>
                                    )}
                                </div>

                                {listaPagos.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                        No existen pagos o anticipos registrados para este pedido.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                                                <tr>
                                                    <th className="px-4 py-2.5">Fecha</th>
                                                    <th className="px-4 py-2.5">Medio</th>
                                                    <th className="px-4 py-2.5 text-right">Monto</th>
                                                    <th className="px-4 py-2.5">Referencia</th>
                                                    <th className="px-4 py-2.5 text-center">Estado</th>
                                                    <th className="px-4 py-2.5 text-center">Recibo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {listaPagos.map((pago) => (
                                                    <tr key={pago.id_pago} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2.5 text-gray-700">
                                                            {formatearFecha(pago.fecha)} {formatearHora(pago.fecha?.split('T')[1])}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                                pago.medio === 'QR'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                {pago.medio}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                                                            Bs {formatearMonto(pago.monto)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600 font-mono text-[11px]">
                                                            {pago.referencia || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                pago.estado === 'CONFIRMADO'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {pago.estado}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            {pago.recibo || pago.id_pago ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setReciboSeleccionado(pago.recibo || pago.id_pago)}
                                                                    className="text-pink-600 hover:text-pink-800 font-semibold underline text-[11px]"
                                                                >
                                                                    Ver recibo
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
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
                        <section className="rounded-xl border border-gray-200 p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                Auditoría y Estado
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {pedido.usuario_preparacion && (
                                    <div className="rounded border bg-gray-50 p-3">
                                        <p className="text-[10px] font-bold uppercase text-gray-500">
                                            Preparado por
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {pedido.usuario_preparacion.nombre ?? 'Usuario'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatearFecha(pedido.fecha_preparacion)} {formatearHora(pedido.fecha_preparacion?.split('T')[1])}
                                        </p>
                                    </div>
                                )}

                                {pedido.usuario_entrega && (
                                    <div className="rounded border bg-green-50 p-3 border-green-200">
                                        <p className="text-[10px] font-bold uppercase text-green-700">
                                            Entregado por
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {pedido.usuario_entrega.nombre ?? 'Usuario'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {formatearFecha(pedido.fecha_entrega_efectiva)} {formatearHora(pedido.fecha_entrega_efectiva?.split('T')[1])}
                                        </p>
                                    </div>
                                )}

                                {pedido.estado === 'CANCELADO' && (
                                    <div className="col-span-full rounded border bg-red-50 p-3 border-red-200">
                                        <p className="text-[10px] font-bold uppercase text-red-700">
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
                <div className="flex justify-end border-t bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
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

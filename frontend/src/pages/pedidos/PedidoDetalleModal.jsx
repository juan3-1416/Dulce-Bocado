function PedidoDetalleModal({
    isOpen,
    onClose,
    pedido,
}) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
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
                            Detalle completo del pedido registrado.
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
                                                detalle,
                                                indice
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

                        {/* Saldos */}
                        <section className="rounded-xl border border-pink-200 bg-pink-50 p-5">
                            <h3 className="mb-4 font-semibold text-pink-900">
                                Resumen de Saldos
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg bg-white p-4 shadow-sm border border-pink-100">
                                    <p className="text-xs font-semibold text-pink-800 uppercase">
                                        Total del pedido
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900">
                                        Bs {formatearMonto(pedido.total)}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white p-4 shadow-sm border border-green-100">
                                    <p className="text-xs font-semibold text-green-800 uppercase">
                                        Total Pagado
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-green-700">
                                        Bs {formatearMonto(pedido.total_pagado)}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-white p-4 shadow-sm border border-pink-200">
                                    <p className="text-xs font-semibold text-pink-800 uppercase">
                                        Saldo Pendiente
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-pink-700">
                                        Bs {formatearMonto(pedido.saldo)}
                                    </p>
                                </div>
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
        </div>
    );
}

export default PedidoDetalleModal;
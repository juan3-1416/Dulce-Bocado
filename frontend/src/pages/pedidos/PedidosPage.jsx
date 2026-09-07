import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    listarPedidos,
    obtenerPedido
} from '../../services/pedidoService.js';

import PedidoModal from './PedidoModal.jsx';
import PedidoDetalleModal from './PedidoDetalleModal.jsx';

function PedidosPage() {
    const [pedidos, setPedidos] =
        useState([]);

    const [cargando, setCargando] =
        useState(true);

    const [error, setError] =
        useState('');

    const [filtros, setFiltros] =
        useState({
            buscar: '',
            estado: '',
            fecha_entrega: ''
        });

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
                    'bg-gray-100 ' +
                    'text-gray-700'
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
        <section className="space-y-6">

            {/* Encabezado */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Pedidos
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
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
                    className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                >
                    + Nuevo Pedido
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                    {/* Buscar */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                            Buscar
                        </label>

                        <input
                            type="text"
                            name="buscar"
                            placeholder="Cliente, CI/NIT o N.º pedido..."
                            value={
                                filtros.buscar
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                            Estado
                        </label>

                        <select
                            name="estado"
                            value={
                                filtros.estado
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                            Fecha de entrega
                        </label>

                        <input
                            type="date"
                            name="fecha_entrega"
                            value={
                                filtros.fecha_entrega
                            }
                            onChange={
                                manejarCambioFiltro
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                    </div>

                    {/* Limpiar */}
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={
                                limpiarFiltros
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Resumen */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Resultados
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {pedidos.length}
                    </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">
                        Programados
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-800">
                        {
                            pedidos.filter(
                                (pedido) =>
                                    pedido.estado ===
                                    'PROGRAMADO'
                            ).length
                        }
                    </p>
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-xs font-semibold uppercase text-yellow-700">
                        En proceso
                    </p>

                    <p className="mt-1 text-2xl font-bold text-yellow-800">
                        {
                            pedidos.filter(
                                (pedido) =>
                                    pedido.estado ===
                                    'EN_PROCESO'
                            ).length
                        }
                    </p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs font-semibold uppercase text-green-700">
                        Entregados
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-800">
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
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                {cargando ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando pedidos...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">

                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Pedido
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Cliente
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                        Entrega
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                                        Productos
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                        Total
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {pedidos.map(
                                    (pedido) => (
                                        <tr
                                            key={
                                                pedido.id_pedido
                                            }
                                            className="hover:bg-gray-50"
                                        >
                                            {/* Número */}
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    #
                                                    {
                                                        pedido.id_pedido
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {formatearFecha(
                                                        pedido.fecha_pedido
                                                    )}
                                                </p>
                                            </td>

                                            {/* Cliente */}
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {obtenerNombreCliente(
                                                        pedido
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {pedido.id_cliente
                                                        ? 'Cliente registrado'
                                                        : 'Cliente ocasional'}
                                                </p>
                                            </td>

                                            {/* Entrega */}
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {formatearFecha(
                                                        pedido.fecha_entrega
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {formatearHora(
                                                        pedido.hora_entrega
                                                    )}
                                                </p>
                                            </td>

                                            {/* Detalles */}
                                            <td className="px-5 py-4 text-center">
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
                                            <td className="px-5 py-4 text-right">
                                                <p className="font-bold text-gray-900">
                                                    Bs{' '}
                                                    {formatearMonto(
                                                        pedido.total
                                                    )}
                                                </p>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-5 py-4 text-center">
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
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">

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
                                                        className="rounded border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        Ver detalle
                                                    </button>

                                                    {pedido.estado ===
                                                        'PROGRAMADO' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirEditarPedido(
                                                                    pedido
                                                                )
                                                            }
                                                            className="rounded border border-pink-200 px-3 py-1.5 text-xs font-semibold text-pink-600 hover:bg-pink-50"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
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
                                            className="px-5 py-10 text-center text-sm text-gray-500"
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
            />
        </section>
    );
}

export default PedidosPage;
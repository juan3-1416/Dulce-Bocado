import { useState, useEffect, useCallback, useMemo } from 'react';
import { listarClientes, cambiarEstadoCliente } from '../../services/clienteService';
import ClienteModal from './ClienteModal';

function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    const [filtros, setFiltros] = useState({
        buscar: '',
        estado: '',
    });

    const [modalAbierto, setModalAbierto] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [clienteNotasExpandidas, setClienteNotasExpandidas] = useState(null);

    const cargarClientes = useCallback(async () => {
        try {
            setCargando(true);
            setError('');
            const respuesta = await listarClientes(filtros);
            setClientes(respuesta.clientes ?? []);
        } catch (err) {
            setError(err.message || 'Error al cargar los clientes.');
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        cargarClientes();
    }, [cargarClientes]);

    const manejarCambioFiltro = (e) => {
        const { name, value } = e.target;
        setFiltros((prev) => ({ ...prev, [name]: value }));
    };

    const abrirModalNuevo = () => {
        setClienteSeleccionado(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (cliente) => {
        setClienteSeleccionado(cliente);
        setModalAbierto(true);
    };

    const alternarEstado = async (cliente) => {
        const accion = cliente.estado ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Estás seguro de que deseas ${accion} al cliente "${cliente.nombre}"?`)) {
            return;
        }

        try {
            await cambiarEstadoCliente(cliente.id_cliente, !cliente.estado);
            setMensajeExito(`Cliente ${cliente.estado ? 'desactivado' : 'activado'} correctamente.`);
            setTimeout(() => setMensajeExito(''), 3000);
            cargarClientes();
        } catch (err) {
            alert(err.message || 'Error al cambiar el estado del cliente.');
        }
    };

    // Estadísticas rápidas
    const metricas = useMemo(() => {
        const total = clientes.length;
        const activos = clientes.filter((c) => c.estado).length;
        const conTelefono = clientes.filter((c) => Boolean(c.telefono)).length;
        return { total, activos, conTelefono };
    }, [clientes]);

    return (
        <div className="space-y-6">
            {/* Header del Módulo */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Directorio de Clientes
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Registro y gestión de clientes para pedidos no presenciales, reservas y entregas.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirModalNuevo}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nuevo Cliente</span>
                </button>
            </div>

            {/* Tarjetas de Métricas Rápidas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Clientes</p>
                    <p className="mt-1 text-2xl font-black text-slate-800">{metricas.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Clientes Activos</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">{metricas.activos}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-pink-600">Con Contacto / Teléfono</p>
                    <p className="mt-1 text-2xl font-black text-pink-700">{metricas.conTelefono}</p>
                </div>
            </div>

            {/* Feedback Mensajes */}
            {mensajeExito && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
                    {mensajeExito}
                </div>
            )}
            {error && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        name="buscar"
                        value={filtros.buscar}
                        onChange={manejarCambioFiltro}
                        placeholder="Buscar por nombre, teléfono/WhatsApp, CI/NIT o dirección..."
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm transition outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    />
                </div>

                <div className="w-full sm:w-48">
                    <select
                        name="estado"
                        value={filtros.estado}
                        onChange={manejarCambioFiltro}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 bg-white"
                    >
                        <option value="">Todos los Estados</option>
                        <option value="1">Solo Activos</option>
                        <option value="0">Solo Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Tabla Principal */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {cargando ? (
                    <div className="flex items-center justify-center p-12 text-sm text-slate-400">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Cargando clientes...
                    </div>
                ) : clientes.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                        No se encontraron clientes registrados con los criterios seleccionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-5 py-3.5">ID</th>
                                    <th className="px-5 py-3.5">Cliente / Razón Social</th>
                                    <th className="px-5 py-3.5">Teléfono / WhatsApp</th>
                                    <th className="px-5 py-3.5">CI / NIT</th>
                                    <th className="px-5 py-3.5">Dirección / Entrega</th>
                                    <th className="px-5 py-3.5">Estado</th>
                                    <th className="px-5 py-3.5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {clientes.map((cliente) => (
                                    <tr key={cliente.id_cliente} className="hover:bg-slate-50/50 transition">
                                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                                            #{cliente.id_cliente}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-semibold text-slate-900">
                                                {cliente.nombre} {cliente.apellido || ''}
                                            </div>
                                            {cliente.correo_electronico && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {cliente.correo_electronico}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {cliente.telefono ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 font-semibold text-xs border border-pink-100">
                                                    <svg className="w-3.5 h-3.5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    {cliente.telefono}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Sin teléfono</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600">
                                            {cliente.ci_nit || <span className="text-xs text-slate-400 italic">Sin NIT/CI</span>}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-xs">
                                            <div className="truncate text-slate-700">
                                                {cliente.direccion || <span className="text-xs text-slate-400 italic">Sin dirección</span>}
                                            </div>
                                            {cliente.observaciones && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setClienteNotasExpandidas((prev) =>
                                                            prev === cliente.id_cliente ? null : cliente.id_cliente
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-pink-600 hover:text-pink-700 mt-0.5"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {clienteNotasExpandidas === cliente.id_cliente ? 'Ocultar notas' : 'Ver notas de entrega'}
                                                </button>
                                            )}
                                            {clienteNotasExpandidas === cliente.id_cliente && (
                                                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                                                    <strong>Notas:</strong> {cliente.observaciones}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    cliente.estado
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}
                                            >
                                                {cliente.estado ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => abrirModalEditar(cliente)}
                                                className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => alternarEstado(cliente)}
                                                className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                                    cliente.estado
                                                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {cliente.estado ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Crear / Editar */}
            <ClienteModal
                abierto={modalAbierto}
                alCerrar={() => setModalAbierto(false)}
                cliente={clienteSeleccionado}
                alGuardarExitoso={cargarClientes}
            />
        </div>
    );
}

export default ClientesPage;

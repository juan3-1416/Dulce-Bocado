import { useState, useEffect } from 'react';
import { crearCliente, actualizarCliente } from '../../services/clienteService';

function ClienteModal({ abierto, alCerrar, cliente, alGuardarExitoso }) {
    const [formulario, setFormulario] = useState({
        nombre: '',
        apellido: '',
        ci_nit: '',
        telefono: '',
        correo_electronico: '',
        direccion: '',
        observaciones: '',
        estado: true,
    });

    const [guardando, setGuardando] = useState(false);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');

    useEffect(() => {
        if (abierto) {
            if (cliente) {
                setFormulario({
                    nombre: cliente.nombre || '',
                    apellido: cliente.apellido || '',
                    ci_nit: cliente.ci_nit || '',
                    telefono: cliente.telefono || '',
                    correo_electronico: cliente.correo_electronico || '',
                    direccion: cliente.direccion || '',
                    observaciones: cliente.observaciones || '',
                    estado: cliente.estado ?? true,
                });
            } else {
                setFormulario({
                    nombre: '',
                    apellido: '',
                    ci_nit: '',
                    telefono: '',
                    correo_electronico: '',
                    direccion: '',
                    observaciones: '',
                    estado: true,
                });
            }
            setErrores({});
            setErrorGeneral('');
        }
    }, [abierto, cliente]);

    if (!abierto) return null;

    const manejarCambio = (e) => {
        const { name, value, type, checked } = e.target;
        setFormulario((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errores[name]) {
            setErrores((prev) => ({ ...prev, [name]: null }));
        }
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setErrores({});
        setErrorGeneral('');

        try {
            const payload = {
                nombre: formulario.nombre.trim(),
                apellido: formulario.apellido.trim() || null,
                ci_nit: formulario.ci_nit.trim() || null,
                telefono: formulario.telefono.trim() || null,
                correo_electronico: formulario.correo_electronico.trim() || null,
                direccion: formulario.direccion.trim() || null,
                observaciones: formulario.observaciones.trim() || null,
                estado: formulario.estado,
            };

            if (cliente?.id_cliente) {
                await actualizarCliente(cliente.id_cliente, payload);
            } else {
                await crearCliente(payload);
            }

            alGuardarExitoso();
            alCerrar();
        } catch (err) {
            if (err.data?.errors) {
                setErrores(err.data.errors);
            } else {
                setErrorGeneral(err.message || 'Ocurrió un error al guardar el cliente.');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden my-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-pink-50/50 to-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {cliente ? 'Editar Cliente' : 'Nuevo Cliente para Pedidos'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Registra o actualiza la información de contacto y entrega del cliente.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={alCerrar}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={manejarEnvio} className="p-6 space-y-4">
                    {errorGeneral && (
                        <div className="rounded-xl bg-red-50 p-3.5 text-sm text-red-700 border border-red-200">
                            {errorGeneral}
                        </div>
                    )}

                    {/* Datos de Identificación */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Nombre / Razón Social <span className="text-pink-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={formulario.nombre}
                                onChange={manejarCambio}
                                required
                                placeholder="Ej. María Elena o Empresa Eventos"
                                className={`w-full rounded-xl border px-3.5 py-2 text-sm transition outline-none focus:ring-2 focus:ring-pink-500/20 ${
                                    errores.nombre ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-pink-500'
                                }`}
                            />
                            {errores.nombre && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.nombre[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Apellido(s) <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                name="apellido"
                                value={formulario.apellido}
                                onChange={manejarCambio}
                                placeholder="Ej. Gonzales Rojas"
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                            {errores.apellido && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.apellido[0]}</p>
                            )}
                        </div>
                    </div>

                    {/* Contacto Prioritario para Pedidos */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="p-3.5 rounded-xl bg-pink-50/40 border border-pink-100">
                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-900 mb-1">
                                <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Teléfono / WhatsApp <span className="text-pink-600 font-bold">* Clave Pedidos</span>
                            </label>
                            <input
                                type="text"
                                name="telefono"
                                value={formulario.telefono}
                                onChange={manejarCambio}
                                placeholder="Ej. 77341209 o 33445566"
                                className={`w-full rounded-lg border bg-white px-3 py-1.5 text-sm transition outline-none focus:ring-2 focus:ring-pink-500/20 ${
                                    errores.telefono ? 'border-red-400' : 'border-pink-200 focus:border-pink-500'
                                }`}
                            />
                            <p className="text-[11px] text-pink-600/80 mt-1">Usado para notificar el estado y entrega del pedido.</p>
                            {errores.telefono && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.telefono[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                CI / NIT <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                name="ci_nit"
                                value={formulario.ci_nit}
                                onChange={manejarCambio}
                                placeholder="Ej. 4928172 o 1029384756"
                                className={`w-full rounded-xl border px-3.5 py-2 text-sm transition outline-none focus:ring-2 focus:ring-pink-500/20 ${
                                    errores.ci_nit ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-pink-500'
                                }`}
                            />
                            {errores.ci_nit && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.ci_nit[0]}</p>
                            )}
                        </div>
                    </div>

                    {/* Correo y Dirección */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Correo Electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="email"
                                name="correo_electronico"
                                value={formulario.correo_electronico}
                                onChange={manejarCambio}
                                placeholder="cliente@ejemplo.com"
                                className={`w-full rounded-xl border px-3.5 py-2 text-sm transition outline-none focus:ring-2 focus:ring-pink-500/20 ${
                                    errores.correo_electronico ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-pink-500'
                                }`}
                            />
                            {errores.correo_electronico && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.correo_electronico[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Dirección / Entrega <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                name="direccion"
                                value={formulario.direccion}
                                onChange={manejarCambio}
                                placeholder="Ej. Av. Busch #450, 2do Anillo"
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                            {errores.direccion && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.direccion[0]}</p>
                            )}
                        </div>
                    </div>

                    {/* Observaciones / Preferencias */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Observaciones de Pedidos / Preferencias
                        </label>
                        <textarea
                            name="observaciones"
                            value={formulario.observaciones}
                            onChange={manejarCambio}
                            rows={2}
                            placeholder="Ej. Horario preferido de entrega, referencias de domicilio o solicitudes especiales..."
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 resize-none"
                        />
                        {errores.observaciones && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errores.observaciones[0]}</p>
                        )}
                    </div>

                    {/* Estado activo */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="estado_cliente"
                            name="estado"
                            checked={formulario.estado}
                            onChange={manejarCambio}
                            className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                        />
                        <label htmlFor="estado_cliente" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Cliente Activo (habilitado para registrar pedidos y ventas)
                        </label>
                    </div>

                    {/* Footer / Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={alCerrar}
                            disabled={guardando}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-xl bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {guardando && (
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {cliente ? 'Guardar Cambios' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClienteModal;

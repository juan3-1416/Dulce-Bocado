import { useState, useEffect, useRef } from 'react';
import { crearCliente, actualizarCliente } from '../../services/clienteService';

function ClienteModal({ abierto, alCerrar, cliente, alGuardarExitoso }) {
    const dialogoRef = useRef(null);
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

    useEffect(() => {
        if (!abierto) return undefined;
        const cerrarConEscape = (event) => {
            if (event.key === 'Escape' && !guardando) alCerrar();
            if (event.key !== 'Tab') return;
            const elementos = dialogoRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])');
            if (!elementos?.length) return;
            const primero = elementos[0];
            const ultimo = elementos[elementos.length - 1];
            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        };
        document.addEventListener('keydown', cerrarConEscape);
        return () => document.removeEventListener('keydown', cerrarConEscape);
    }, [abierto, guardando, alCerrar]);

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
            };

            if (!cliente) payload.estado = formulario.estado;

            if (cliente?.id_cliente) {
                await actualizarCliente(cliente.id_cliente, payload);
            } else {
                await crearCliente(payload);
            }

            alGuardarExitoso(cliente ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-4">
            <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="cliente-modal-titulo" className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-5 py-4 sm:px-6">
                    <div>
                        <h2 id="cliente-modal-titulo" className="text-lg font-semibold text-theme-heading">
                            {cliente ? 'Editar cliente' : 'Nuevo cliente'}
                        </h2>
                        <p className="mt-1 text-sm text-theme-muted">
                            Registra o actualiza la información de contacto y entrega del cliente.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Cerrar formulario de cliente"
                        onClick={alCerrar}
                        disabled={guardando}
                        className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={manejarEnvio} className="space-y-5 p-5 sm:p-6">
                    {errorGeneral && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                            {errorGeneral}
                        </div>
                    )}

                    {/* Datos de Identificación */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="cliente-nombre" className="mb-1.5 block text-sm font-medium text-theme-body">
                                Nombre / Razón Social <span className="text-pink-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="cliente-nombre"
                                autoFocus
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
                            <label htmlFor="cliente-apellido" className="mb-1.5 block text-sm font-medium text-theme-body">
                                Apellido(s) <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                id="cliente-apellido"
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
                        <div>
                            <label htmlFor="cliente-telefono" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-theme-body">
                                <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Teléfono / WhatsApp
                            </label>
                            <input
                                type="text"
                                id="cliente-telefono"
                                name="telefono"
                                value={formulario.telefono}
                                onChange={manejarCambio}
                                placeholder="Ej. 77341209 o 33445566"
                                className={`w-full rounded-lg border bg-theme-surface px-3 py-2.5 text-sm text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                                    errores.telefono ? 'border-red-400' : 'border-theme-border-subtle'
                                }`}
                            />
                            <p className="mt-1 text-xs text-theme-muted">Usado para notificar el estado y entrega del pedido.</p>
                            {errores.telefono && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errores.telefono[0]}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="cliente-ci-nit" className="mb-1.5 block text-sm font-medium text-theme-body">
                                CI / NIT <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                id="cliente-ci-nit"
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
                            <label htmlFor="cliente-correo" className="mb-1.5 block text-sm font-medium text-theme-body">
                                Correo Electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="email"
                                id="cliente-correo"
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
                            <label htmlFor="cliente-direccion" className="mb-1.5 block text-sm font-medium text-theme-body">
                                Dirección / Entrega <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                id="cliente-direccion"
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
                        <label htmlFor="cliente-observaciones" className="mb-1.5 block text-sm font-medium text-theme-body">
                            Observaciones de Pedidos / Preferencias
                        </label>
                        <textarea
                            id="cliente-observaciones"
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
                    {!cliente && <div className="flex items-center gap-2 pt-1">
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
                    </div>}

                    {/* Footer / Botones */}
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-theme-border-subtle pt-4">
                        <button
                            type="button"
                            onClick={alCerrar}
                            disabled={guardando}
                            className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex min-h-11 items-center gap-2 rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-theme-brand-text hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
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

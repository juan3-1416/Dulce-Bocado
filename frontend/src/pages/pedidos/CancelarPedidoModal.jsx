import { useState } from 'react';

function CancelarPedidoModal({ isOpen, onClose, pedido, onConfirm }) {
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !pedido) {
        return null;
    }

    const manejarSubmit = async (e) => {
        e.preventDefault();

        if (motivo.trim().length < 5) {
            setError('El motivo de cancelación debe tener al menos 5 caracteres.');
            return;
        }

        try {
            setGuardando(true);
            setError('');
            await onConfirm(pedido.id_pedido, motivo.trim());
            setMotivo('');
            onClose();
        } catch (err) {
            setError(err.message || 'Error al cancelar el pedido.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="cancelar-pedido-titulo" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-5 py-4 sm:px-6">
                    <div>
                        <h2 id="cancelar-pedido-titulo" className="text-xl font-semibold tracking-tight text-theme-heading">
                            Cancelar pedido #{pedido.id_pedido}
                        </h2>
                        <p className="mt-1 text-sm text-theme-muted">Indica el motivo para dejar constancia.</p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={guardando}
                        aria-label="Cerrar"
                        className="rounded-lg px-2 py-1 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                    >
                        Cerrar
                    </button>
                </div>

                <form onSubmit={manejarSubmit} className="space-y-5 p-5 sm:p-6">
                    {error && (
                        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                        El pedido quedará cancelado y se registrará el motivo. Esta acción no se puede deshacer.
                    </div>

                    <div>
                        <label
                            htmlFor="motivo_cancelacion"
                            className="mb-1.5 block text-sm font-medium text-theme-body"
                        >
                            Motivo de cancelación
                        </label>
                        <textarea
                            id="motivo_cancelacion"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={4}
                            maxLength={500}
                            placeholder="Explique el motivo por el cual se cancela este pedido..."
                            aria-describedby="motivo-cancelacion-ayuda"
                            className="w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-heading placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        />
                        <p id="motivo-cancelacion-ayuda" className="mt-1.5 text-xs text-theme-muted">
                            Mínimo 5 caracteres.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-theme-border-subtle pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={guardando}
                            className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
                        >
                            Volver
                        </button>

                        <button
                            type="submit"
                            disabled={guardando || motivo.trim().length < 5}
                            className="min-h-11 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando ? 'Confirmando...' : 'Confirmar cancelación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CancelarPedidoModal;

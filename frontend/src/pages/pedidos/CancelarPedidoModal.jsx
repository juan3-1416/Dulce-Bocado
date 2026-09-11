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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Cancelar Pedido #{pedido.id_pedido}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={guardando}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={manejarSubmit} className="space-y-5 p-6">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Esta acción es irreversible. El pedido será marcado como CANCELADO y se requerirá un motivo.
                    </div>

                    <div>
                        <label
                            htmlFor="motivo_cancelacion"
                            className="mb-1 block text-sm font-medium text-gray-700"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Mínimo 5 caracteres.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={guardando}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={guardando || motivo.trim().length < 5}
                            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando ? 'Confirmando...' : 'Confirmar Cancelación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CancelarPedidoModal;

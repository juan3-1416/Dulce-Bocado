function PagoFormularioCampos({
  monto,
  setMonto,
  metodoPago,
  setMetodoPago,
  referencia,
  setReferencia,
  observaciones,
  setObservaciones,
  metodosPago = [],
  documentoSeleccionado,
  usarSaldoCompleto,
}) {
  return (
    <div className="space-y-4">
      {/* Monto y Método de Pago */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="monto_pago"
              className="block text-sm font-medium text-gray-700"
            >
              Monto
            </label>

            {documentoSeleccionado && (
              <button
                type="button"
                onClick={usarSaldoCompleto}
                className="text-xs font-semibold text-pink-600 hover:text-pink-700"
              >
                Usar saldo completo
              </button>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-gray-500">
              Bs
            </span>
            <input
              id="monto_pago"
              type="number"
              min="0.01"
              step="0.01"
              max={documentoSeleccionado ? documentoSeleccionado.saldo : undefined}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              disabled={!documentoSeleccionado}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-gray-100"
            />
          </div>

          {documentoSeleccionado && (
            <p className="mt-1 text-xs text-gray-500">
              Máximo: Bs {Number(documentoSeleccionado.saldo).toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="metodo_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Método de pago
          </label>
          <select
            id="metodo_pago"
            value={metodoPago}
            onChange={(e) => {
              setMetodoPago(e.target.value)
              if (e.target.value === 'EFECTIVO') {
                setReferencia('')
              }
            }}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            {metodosPago.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo === 'EFECTIVO'
                  ? 'Efectivo'
                  : metodo === 'QR'
                  ? 'QR'
                  : metodo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Referencia QR */}
      {metodoPago === 'QR' && (
        <div>
          <label
            htmlFor="referencia_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Referencia QR
          </label>
          <input
            id="referencia_pago"
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            maxLength={150}
            placeholder="Ej. QR-001245"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Campo opcional para registrar una referencia del pago.
          </p>
        </div>
      )}

      {/* Observaciones */}
      <div>
        <label
          htmlFor="observaciones_pago"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Observaciones
        </label>
        <textarea
          id="observaciones_pago"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Observaciones adicionales..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
        />
      </div>
    </div>
  )
}

export default PagoFormularioCampos

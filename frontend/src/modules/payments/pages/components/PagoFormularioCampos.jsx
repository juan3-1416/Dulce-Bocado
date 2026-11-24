function PagoFormularioCampos({
  monto,
  setMonto,
  metodoPago,
  setMetodoPago,
  referencia,
  setReferencia,
  observaciones,
  setObservaciones,
  metodosPago = ['EFECTIVO', 'QR'],
  documentoSeleccionado,
  usarSaldoCompleto,
  _tipoCobro,
}) {
  const saldoPendiente = Number(documentoSeleccionado?.saldo ?? 0)

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
              Monto a cobrar
            </label>

            {documentoSeleccionado && saldoPendiente > 0 && (
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
            <span className="absolute left-3 top-2.5 text-sm font-medium text-gray-500">
              Bs
            </span>
            <input
              id="monto_pago"
              type="number"
              min="0.01"
              step="0.01"
              max={saldoPendiente > 0 ? saldoPendiente : undefined}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              disabled={!documentoSeleccionado || saldoPendiente <= 0}
              placeholder={saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-gray-100"
            />
          </div>

          {documentoSeleccionado && (
            <p className="mt-1 text-xs text-gray-500">
              {saldoPendiente > 0
                ? `Saldo pendiente: Bs ${saldoPendiente.toFixed(2)} (Se aceptan pagos parciales)`
                : 'Esta operación ya no tiene saldo pendiente por cobrar.'}
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
                {metodo === 'EFECTIVO' ? 'Efectivo' : metodo === 'QR' ? 'QR (Pasarela Oficial)' : metodo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aviso informativo de QR según acuerdo PO */}
      {metodoPago === 'QR' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
          <p className="font-semibold">Integración de Pasarela de Pago Oficial</p>
          <p className="mt-1 text-blue-800">
            La integración de pagos QR se realizará al cierre del Sprint 4 directamente con la API y documentación oficial de la pasarela que entregará el Product Owner. Seleccione <strong>Efectivo</strong> para registrar los cobros presenciales de esta etapa.
          </p>
        </div>
      )}

      {/* Referencia opcional */}
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
          placeholder="Observaciones adicionales sobre el pago..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
        />
      </div>
    </div>
  )
}

export default PagoFormularioCampos

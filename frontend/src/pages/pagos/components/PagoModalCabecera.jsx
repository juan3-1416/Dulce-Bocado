/**
 * Cabecera del modal de pago.
 *
 * Muestra título y subtítulo dinámicos según si hay un QR activo,
 * más el botón de cierre.
 *
 * @param {object}   props
 * @param {object|null} props.transaccionQr  — null mientras se usa el formulario
 * @param {boolean}     props.guardando
 * @param {Function}    props.onCerrar
 */
function PagoModalCabecera({
  transaccionQr,
  guardando,
  onCerrar,
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {transaccionQr
            ? 'Pago mediante QR'
            : 'Registrar Pago'}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {transaccionQr
            ? 'Escanee el código para confirmar el pago.'
            : 'Registra un pago parcial o total de una venta o pedido.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onCerrar}
        disabled={guardando}
        className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  )
}

export default PagoModalCabecera

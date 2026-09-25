/**
 * Panel completo que se muestra mientras existe una transacción QR activa de Libélula.
 *
 * Maneja los estados del QR: PENDIENTE, APROBADO y VENCIDO.
 *
 * @param {object}   props
 * @param {object}   props.transaccionQr
 * @param {string}   props.error
 * @param {boolean}  props.qrPendiente
 * @param {boolean}  props.qrAprobado
 * @param {boolean}  props.qrVencido
 * @param {boolean}  props.consultandoQr
 * @param {Function} props.onCerrar
 */
function PagoVistaQr({
  transaccionQr,
  error,
  qrPendiente,
  qrAprobado,
  qrVencido,
  consultandoQr,
  onCerrar,
}) {
  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Venta #{transaccionQr.id_venta}
        </p>

        <p className="mt-2 text-3xl font-bold text-gray-900">
          Bs {Number(transaccionQr.monto).toFixed(2)}
        </p>
      </div>

      {qrPendiente && (
        <>
          <div className="mx-auto flex w-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <img
              src={transaccionQr.qr_simple_url}
              alt="QR de pago generado por Libélula"
              className="h-[250px] w-[250px] object-contain"
            />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Esperando pago...
            </div>

            <p className="mt-3 text-sm text-gray-500">
              El cliente debe escanear este código QR con su aplicación bancaria.
            </p>

            <p className="mt-2 text-xs text-gray-400">
              La confirmación llegará automáticamente desde Libélula.
            </p>

            {consultandoQr && (
              <p className="mt-2 text-xs text-gray-400">
                Verificando estado del pago...
              </p>
            )}
          </div>
        </>
      )}

      {qrAprobado && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-5xl">✅</div>
          <h3 className="mt-3 text-xl font-bold text-green-800">
            Pago confirmado
          </h3>
          <p className="mt-2 text-sm text-green-700">
            El pago y el recibo fueron generados automáticamente.
          </p>
        </div>
      )}

      {qrVencido && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-5xl">⌛</div>
          <h3 className="mt-3 text-xl font-bold text-amber-800">
            QR vencido
          </h3>
          <p className="mt-2 text-sm text-amber-700">
            Debe generar un nuevo código QR.
          </p>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase text-gray-400">
          Referencia
        </p>
        <p className="mt-1 break-all text-sm text-gray-700">
          {transaccionQr.referencia_transaccion}
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default PagoVistaQr

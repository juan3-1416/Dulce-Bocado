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
  const tipoOrigen = transaccionQr?.origen_tipo === 'PEDIDO' ? 'Pedido' : 'Venta'
  const idOrigen = transaccionQr?.origen_id || transaccionQr?.id_venta || transaccionQr?.id_pedido
  const imagenQr = transaccionQr?.qr_url || transaccionQr?.qr_simple_url
  const referencia =
    transaccionQr?.referencia_proveedor ||
    transaccionQr?.referencia_transaccion ||
    transaccionQr?.identificador ||
    `#${transaccionQr?.id_intento_qr ?? ''}`

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-medium text-gray-500">
          {tipoOrigen} #{idOrigen}
        </p>

        <p className="mt-2 text-3xl font-bold text-gray-900">
          Bs {Number(transaccionQr?.monto ?? 0).toFixed(2)}
        </p>
      </div>

      {qrPendiente && (
        <>
          {imagenQr ? (
            <div className="mx-auto flex w-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <img
                src={imagenQr}
                alt="QR de pago generado por Libélula"
                className="h-[250px] w-[250px] object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-[250px] w-[250px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
              Generando código QR...
            </div>
          )}

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
                Verificando estado del pago en tiempo real...
              </p>
            )}

            {transaccionQr?.pasarela_url && (
              <div className="mt-4">
                <a
                  href={transaccionQr.pasarela_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 underline"
                >
                  Abrir enlace de pago Libélula en otra pestaña ↗
                </a>
              </div>
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
            El pago fue verificado y registrado en el sistema.
          </p>
        </div>
      )}

      {qrVencido && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-5xl">⌛</div>
          <h3 className="mt-3 text-xl font-bold text-amber-800">
            QR vencido o expirado
          </h3>
          <p className="mt-2 text-sm text-amber-700">
            Debe generar un nuevo código QR.
          </p>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase text-gray-400">
          Referencia de Transacción
        </p>
        <p className="mt-1 break-all text-sm font-mono text-gray-700">
          {referencia}
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

import { useState } from 'react'

import { usePagoQr } from './hooks/usePagoQr'
import { usePagoFormulario } from './hooks/usePagoFormulario'

import PagoModalCabecera from './components/PagoModalCabecera'
import PagoVistaQr from './components/PagoVistaQr'
import PagoDocumentoSelector from './components/PagoDocumentoSelector'
import PagoResumenDocumento from './components/PagoResumenDocumento'
import PagoFormularioCampos from './components/PagoFormularioCampos'

/**
 * Modal de registro de pagos.
 *
 * Actúa como orquestador: conecta usePagoQr y usePagoFormulario
 * y decide qué vista mostrar (formulario o panel QR de Libélula).
 *
 * @param {object}      props
 * @param {boolean}     props.abierto
 * @param {Function}    props.onCerrar
 * @param {Function}    props.onGuardado
 * @param {Array}       props.ventas
 * @param {Array}       props.pedidos
 * @param {Array}       props.metodosPago
 * @param {number|null} props.ventaInicialId
 * @param {object|null} props.pedidoSeleccionadoInicial
 */
function PagoModal({
  abierto,
  onCerrar,
  onGuardado,
  ventas = [],
  pedidos = [],
  metodosPago = [],
  ventaInicialId = null,
  pedidoSeleccionadoInicial = null,
}) {
  /*
   * Estado de error compartido entre el formulario y la vista QR.
   */
  const [error, setError] = useState('')

  const qr = usePagoQr({
    abierto,
    onGuardado,
    onCerrar,
    setError,
  })

  const form = usePagoFormulario({
    abierto,
    ventas,
    pedidos,
    metodosPago,
    ventaInicialId,
    pedidoSeleccionadoInicial,
    onGuardado,
    onCerrar,
    onIniciarQr: qr.iniciarQr,
    setError,
  })

  if (!abierto) return null

  const sinDocumentos =
    ventas.length === 0 && pedidos.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <PagoModalCabecera
          transaccionQr={qr.transaccionQr}
          guardando={form.guardando}
          onCerrar={onCerrar}
        />

        {qr.transaccionQr ? (
          <PagoVistaQr
            transaccionQr={qr.transaccionQr}
            error={error}
            qrPendiente={qr.qrPendiente}
            qrAprobado={qr.qrAprobado}
            qrVencido={qr.qrVencido}
            consultandoQr={qr.consultandoQr}
            onCerrar={onCerrar}
          />
        ) : (
          <form
            onSubmit={form.manejarSubmit}
            className="space-y-6 p-6"
          >

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {sinDocumentos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No existen comprobantes registrados con saldo pendiente.
              </div>
            ) : (
              <>
                <PagoDocumentoSelector
                  tipoCobro={form.tipoCobro}
                  setTipoCobro={form.setTipoCobro}
                  idVenta={form.idVenta}
                  idPedido={form.idPedido}
                  ventas={ventas}
                  pedidos={pedidos}
                  manejarCambioVenta={form.manejarCambioVenta}
                  manejarCambioPedido={form.manejarCambioPedido}
                  obtenerNombreCliente={form.obtenerNombreCliente}
                />

                <PagoResumenDocumento
                  tipoCobro={form.tipoCobro}
                  documentoSeleccionado={form.documentoSeleccionado}
                />

                <PagoFormularioCampos
                  monto={form.monto}
                  setMonto={form.setMonto}
                  metodoPago={form.metodoPago}
                  setMetodoPago={(nuevoMetodo) => {
                    form.setMetodoPago(nuevoMetodo)
                    form.setReferencia('')
                    setError('')
                  }}
                  tipoCobro={form.tipoCobro}
                  referencia={form.referencia}
                  setReferencia={form.setReferencia}
                  observaciones={form.observaciones}
                  setObservaciones={form.setObservaciones}
                  metodosPago={metodosPago}
                  documentoSeleccionado={form.documentoSeleccionado}
                  usarSaldoCompleto={form.usarSaldoCompleto}
                />
              </>
            )}

            {form.metodoPago === 'QR' &&
              form.tipoCobro === 'venta' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Al continuar se generará un QR real de Libélula. El pago solo será registrado cuando Libélula confirme la transacción.
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

              <button
                type="button"
                onClick={onCerrar}
                disabled={form.guardando}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  form.guardando || sinDocumentos
                }
                className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {form.guardando
                  ? form.metodoPago === 'QR'
                    ? 'Generando QR...'
                    : 'Registrando...'
                  : form.metodoPago === 'QR'
                    ? 'Generar QR'
                    : 'Registrar Pago'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default PagoModal
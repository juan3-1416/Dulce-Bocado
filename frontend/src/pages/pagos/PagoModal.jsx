import { useEffect, useMemo, useState } from 'react'
import { crearPago } from '../../services/pagoService'
import PagoDocumentoSelector from './components/PagoDocumentoSelector'
import PagoResumenDocumento from './components/PagoResumenDocumento'
import PagoFormularioCampos from './components/PagoFormularioCampos'

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
  const [tipoCobro, setTipoCobro] = useState('venta') // 'venta' o 'pedido'
  const [idVenta, setIdVenta] = useState('')
  const [idPedido, setIdPedido] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto) return

    setIdVenta('')
    setIdPedido('')
    setMonto('')
    setMetodoPago(metodosPago?.[0] || 'EFECTIVO')
    setReferencia('')
    setObservaciones('')
    setError('')

    if (pedidoSeleccionadoInicial) {
      setTipoCobro('pedido')
      setIdPedido(String(pedidoSeleccionadoInicial.id_pedido))
      setMonto(String(pedidoSeleccionadoInicial.saldo))
      return
    }

    if (ventaInicialId) {
      const ventaInicial = ventas.find(
        (v) => Number(v.id_venta) === Number(ventaInicialId)
      )
      setTipoCobro('venta')
      setIdVenta(String(ventaInicialId))
      if (ventaInicial) {
        setMonto(String(ventaInicial.saldo))
      }
      return
    }

    if (pedidos.length > 0 && ventas.length === 0) {
      setTipoCobro('pedido')
    } else {
      setTipoCobro('venta')
    }
  }, [abierto, metodosPago, ventaInicialId, pedidoSeleccionadoInicial, ventas, pedidos])

  const ventaSeleccionada = useMemo(
    () => ventas.find((v) => Number(v.id_venta) === Number(idVenta)) ?? null,
    [ventas, idVenta]
  )

  const pedidoSeleccionado = useMemo(
    () => pedidos.find((p) => Number(p.id_pedido) === Number(idPedido)) ?? null,
    [pedidos, idPedido]
  )

  const documentoSeleccionado = tipoCobro === 'venta' ? ventaSeleccionada : pedidoSeleccionado

  const obtenerNombreCliente = (doc) => {
    if (!doc) return ''
    if (doc.cliente) {
      return [doc.cliente.nombre, doc.cliente.apellido].filter(Boolean).join(' ')
    }
    return doc.nombre_cliente_ocasional || 'Cliente ocasional'
  }

  const manejarCambioVenta = (e) => {
    setIdVenta(e.target.value)
    setMonto('')
    setError('')
  }

  const manejarCambioPedido = (e) => {
    setIdPedido(e.target.value)
    setMonto('')
    setError('')
  }

  const usarSaldoCompleto = () => {
    if (documentoSeleccionado) {
      setMonto(String(documentoSeleccionado.saldo))
    }
  }

  const obtenerMensajeError = (errorPeticion) => {
    const errores = errorPeticion.data?.errors
    if (errores) {
      const primerError = Object.values(errores)[0]
      if (Array.isArray(primerError)) return primerError[0]
    }
    return errorPeticion.message || 'No se pudo registrar el pago.'
  }

  const manejarSubmit = async (e) => {
    e.preventDefault()

    if (tipoCobro === 'venta' && !idVenta) {
      setError('Debe seleccionar una venta.')
      return
    }

    if (tipoCobro === 'pedido' && !idPedido) {
      setError('Debe seleccionar un pedido.')
      return
    }

    const montoNumero = Number(monto)
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto debe ser mayor a cero.')
      return
    }

    const saldo = Number(documentoSeleccionado?.saldo ?? 0)
    if (montoNumero > saldo) {
      setError(`El monto no puede superar el saldo pendiente de Bs ${saldo.toFixed(2)}.`)
      return
    }

    if (!['EFECTIVO', 'QR'].includes(metodoPago)) {
      setError('Seleccione un método de pago válido.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      const payload = {
        monto: montoNumero,
        metodo_pago: metodoPago,
        referencia: referencia.trim() || null,
        observaciones: observaciones.trim() || null,
      }

      if (tipoCobro === 'venta') {
        payload.id_venta = Number(idVenta)
      } else {
        payload.id_pedido = Number(idPedido)
      }

      const respuesta = await crearPago(payload)

      await onGuardado(
        respuesta?.message || 'Pago registrado correctamente.',
        respuesta?.pago ?? null,
        respuesta
      )

      onCerrar()
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion))
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
            <p className="mt-1 text-sm text-gray-500">
              Registra un pago parcial o total de una venta o pedido.
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

        {/* Formulario */}
        <form onSubmit={manejarSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {ventas.length === 0 && pedidos.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No existen comprobantes registrados con saldo pendiente.
            </div>
          ) : (
            <>
              <PagoDocumentoSelector
                tipoCobro={tipoCobro}
                setTipoCobro={setTipoCobro}
                idVenta={idVenta}
                idPedido={idPedido}
                ventas={ventas}
                pedidos={pedidos}
                manejarCambioVenta={manejarCambioVenta}
                manejarCambioPedido={manejarCambioPedido}
                obtenerNombreCliente={obtenerNombreCliente}
              />

              <PagoResumenDocumento
                tipoCobro={tipoCobro}
                documentoSeleccionado={documentoSeleccionado}
              />

              <PagoFormularioCampos
                monto={monto}
                setMonto={setMonto}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                referencia={referencia}
                setReferencia={setReferencia}
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                metodosPago={metodosPago}
                documentoSeleccionado={documentoSeleccionado}
                usarSaldoCompleto={usarSaldoCompleto}
              />
            </>
          )}

          {/* Footer de Acciones */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                guardando || (ventas.length === 0 && pedidos.length === 0)
              }
              className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PagoModal
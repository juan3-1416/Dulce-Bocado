import { useCallback, useEffect, useRef, useState } from 'react'
import { confirmarVenta, generarIdempotencyKey, obtenerVenta } from '../../services/ventaService'
import { consultarStockMostrador } from '../../services/inventarioConsultaService'

export default function ConfirmarVentaModal({
  abierto,
  venta,
  onCerrar,
  onConfirmado,
  tienePermisoInventario = false,
}) {
  const [detallesVenta, setDetallesVenta] = useState([])
  const [cargandoDetalles, setCargandoDetalles] = useState(false)
  const [stockMostrador, setStockMostrador] = useState({})
  const [cargandoStock, setCargandoStock] = useState(false)
  const [errorStock, setErrorStock] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmacion, setErrorConfirmacion] = useState('')
  const [codigoError, setCodigoError] = useState('')
  const intentoConfirmar = useRef(null)
  const dialogoRef = useRef(null)

  useEffect(() => {
    if (!abierto || !venta) return undefined
    const manejarTeclado = (event) => {
      if (event.key === 'Escape' && !confirmando) onCerrar()
      if (event.key !== 'Tab') return
      const controles = dialogoRef.current?.querySelectorAll('button:not([disabled])')
      if (!controles?.length) return
      const primero = controles[0]
      const ultimo = controles[controles.length - 1]
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus() }
      if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', manejarTeclado)
    return () => document.removeEventListener('keydown', manejarTeclado)
  }, [abierto, venta, confirmando, onCerrar])

  const cargarDetallesYStock = useCallback(async (signal) => {
    if (!venta) return
    setErrorConfirmacion('')
    setCodigoError('')
    setErrorStock('')

    // 1. Asegurar detalles de la venta
    let items = venta.detalles ?? []
    if (!items.length) {
      try {
        setCargandoDetalles(true)
        const resp = await obtenerVenta(venta.id_venta)
        const ventaCompleta = resp.venta ?? resp
        items = ventaCompleta.detalles ?? []
        if (signal?.aborted) return
        setDetallesVenta(items)
      } catch (err) {
        if (signal?.aborted) return
        setErrorConfirmacion(err.message || 'No se pudieron obtener los detalles de la venta.')
        return
      } finally {
        if (!signal?.aborted) setCargandoDetalles(false)
      }
    } else {
      setDetallesVenta(items)
    }

    // 2. Si tiene permiso de inventario, consultar existencias de mostrador
    if (tienePermisoInventario) {
      try {
        setCargandoStock(true)
        const { stockPorPresentacion } = await consultarStockMostrador({ signal })
        if (signal?.aborted) return
        setStockMostrador(stockPorPresentacion)
      } catch (err) {
        if (signal?.aborted) return
        setErrorStock(err.message || 'No se pudo consultar el stock actual en Mostrador.')
        setStockMostrador({})
      } finally {
        if (!signal?.aborted) setCargandoStock(false)
      }
    }
  }, [venta, tienePermisoInventario])

  useEffect(() => {
    if (!abierto || !venta) return undefined

    // Generar clave idempotente si no existe para esta venta
    if (intentoConfirmar.current?.idVenta !== venta.id_venta) {
      intentoConfirmar.current = {
        idVenta: venta.id_venta,
        clave: generarIdempotencyKey('vconf'),
      }
    }

    const controller = new AbortController()
    void cargarDetallesYStock(controller.signal)
    return () => controller.abort()
  }, [abierto, venta, cargarDetallesYStock])

  if (!abierto || !venta) return null

  // Verificar si hay algún artículo con stock insuficiente conocido
  const articulosConStock = detallesVenta.map((detalle) => {
    const presentacionId = Number(detalle.presentacion_id)
    const requerido = Number(detalle.cantidad)
    const disponible = stockMostrador[presentacionId]
    const tieneDatoStock = typeof disponible === 'number'
    const suficiente = tieneDatoStock ? disponible >= requerido : null
    return {
      ...detalle,
      presentacionId,
      requerido,
      disponible,
      tieneDatoStock,
      suficiente,
    }
  })

  const hayArticuloInsuficiente = articulosConStock.some(
    (item) => item.tieneDatoStock && item.suficiente === false,
  )

  const ejecutarConfirmacion = async () => {
    if (confirmando) return

    if (!intentoConfirmar.current?.clave) {
      intentoConfirmar.current = {
        idVenta: venta.id_venta,
        clave: generarIdempotencyKey('vconf'),
      }
    }

    try {
      setConfirmando(true)
      setErrorConfirmacion('')
      setCodigoError('')

      const respuesta = await confirmarVenta(
        venta.id_venta,
        intentoConfirmar.current.clave,
      )

      const mensajeExito =
        respuesta?.message ||
        `Venta #${venta.id_venta} confirmada exitosamente con descuento de existencias en Mostrador.`

      intentoConfirmar.current = null
      onConfirmado(mensajeExito, respuesta?.venta ?? null)
      onCerrar()
    } catch (err) {
      const code = err.data?.error?.code || (err.status === 409 ? 'CONFLICTO' : '')
      setCodigoError(code)

      if (code === 'STOCK_INSUFICIENTE') {
        setErrorConfirmacion(
          'Stock insuficiente: El almacén Mostrador no cuenta con las existencias requeridas para esta venta. Repón existencias desde producción o modifica los artículos del borrador.',
        )
      } else if (code === 'VENTA_NO_CONFIRMABLE') {
        setErrorConfirmacion(
          'Esta venta no puede confirmarse porque ya fue confirmada o cancelada anteriormente.',
        )
      } else if (code === 'CLAVE_IDEMPOTENTE_EN_CONFLICTO') {
        setErrorConfirmacion(
          'Ya se procesó un intento de confirmación previo para esta venta. Por favor, actualiza el listado o verifica si ya fue confirmada antes de intentar nuevamente.',
        )
      } else if (code === 'INVENTORY_NO_DISPONIBLE') {
        setErrorConfirmacion(
          'El servicio de inventario no respondió a tiempo. Por favor, espera un momento y vuelve a intentar la confirmación.',
        )
      } else if (code === 'CONFIRMACION_INCIERTA') {
        setErrorConfirmacion(
          'No se pudo verificar el resultado del descuento en inventario. Por favor, intenta nuevamente para validar la operación.',
        )
      } else if (code === 'INVENTORY_RECHAZO') {
        setErrorConfirmacion(
          'El inventario no permitió confirmar la venta debido a existencias insuficientes o almacén no disponible.',
        )
      } else if (err.status === 403) {
        setErrorConfirmacion(
          'No tienes permiso para confirmar ventas (se requiere el permiso de confirmación de ventas).',
        )
      } else {
        const rawMessage = err.data?.error?.message || err.message || ''
        const esTecnico = /CLAVE_IDEMPOTENTE|idempotent|SQLSTATE|PDOException/i.test(rawMessage)
        setErrorConfirmacion(
          esTecnico || !rawMessage
            ? 'Ocurrió un inconveniente al intentar confirmar la venta. Por favor, intenta nuevamente.'
            : rawMessage,
        )
      }
    } finally {
      setConfirmando(false)
    }
  }

  const clienteNombre =
    venta.nombre_cliente_ocasional ||
    (venta.id_cliente ? `Cliente #${venta.id_cliente}` : 'Cliente ocasional')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
      <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="confirmar-venta-titulo" className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-5 py-4 sm:px-6">
          <div>
            <h2 id="confirmar-venta-titulo" className="text-xl font-semibold text-theme-heading">
              Confirmar venta #{venta.id_venta}
            </h2>
            <p className="mt-1 text-sm text-theme-muted">
              Revisa los artículos antes de descontar existencias de Mostrador.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={confirmando}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
            aria-label="Cerrar confirmación"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* Mensajes de error */}
          {errorConfirmacion && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <div className="flex items-start gap-2">
                <span className="font-bold">Error:</span>
                <p>{errorConfirmacion}</p>
              </div>
            </div>
          )}

          {/* Resumen de la venta */}
          <div className="grid gap-4 rounded-xl bg-theme-subtle p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Cliente</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{clienteNombre}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total</p>
              <p className="mt-0.5 text-base font-bold text-gray-900">
                Bs {Number(venta.total ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Estado actual</p>
              <span className="mt-0.5 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {venta.estado}
              </span>
            </div>
          </div>

          {/* Alerta de stock insuficiente detectada preventivamente */}
          {hayArticuloInsuficiente && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="font-bold">!</span>
                <div>
                  <p className="font-semibold">Existencias insuficientes en Mostrador</p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Uno o más productos no disponen de stock suficiente en el almacén Mostrador. Si confirma ahora, el servicio de Inventario rechazará la operación y la venta permanecerá en borrador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de verificación de disponibilidad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Artículos a descontar de Mostrador
              </h3>
              {tienePermisoInventario && (
                <span className="text-xs text-gray-500">
                  {cargandoStock
                    ? 'Consultando existencias...'
                    : errorStock
                      ? 'Error consultando stock'
                      : 'Stock verificado en Mostrador'}
                </span>
              )}
            </div>

            {cargandoDetalles ? (
              <div className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                Cargando artículos de la venta...
              </div>
            ) : articulosConStock.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-4 text-center text-sm text-gray-500">
                No hay artículos registrados en esta venta.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-theme-border-subtle">
                <table className="min-w-[540px] divide-y divide-theme-border-subtle text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Presentación</th>
                      <th className="px-4 py-2.5 text-center">Cant. Requerida</th>
                      {tienePermisoInventario && (
                        <th className="px-4 py-2.5 text-center">Stock Mostrador</th>
                      )}
                      <th className="px-4 py-2.5 text-right">Disponibilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {articulosConStock.map((item) => (
                      <tr key={item.id_detalle_venta || item.presentacionId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.nombre_presentacion_snapshot || `Presentación #${item.presentacionId}`}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {item.requerido} unid.
                        </td>
                        {tienePermisoInventario && (
                          <td className="px-4 py-3 text-center">
                            {cargandoStock ? (
                              <span className="text-gray-400">...</span>
                            ) : item.tieneDatoStock ? (
                              <span className="font-semibold text-gray-800">
                                {item.disponible} unid.
                              </span>
                            ) : (
                              <span className="text-theme-muted">Sin dato</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          {item.tieneDatoStock ? (
                            item.suficiente ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                Disponible
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                                Insuficiente ({item.disponible ?? 0}/{item.requerido})
                              </span>
                            )
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              Validar en servidor
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-theme-subtle p-3 text-sm text-theme-body">
            Al confirmar, la venta pasará a confirmada y se descontarán las existencias de Mostrador. Si no hay stock suficiente, la venta seguirá en borrador.
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-theme-border-subtle bg-theme-subtle px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onCerrar}
            disabled={confirmando}
            className="min-h-11 rounded-lg border border-theme-border-subtle bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={ejecutarConfirmacion}
            disabled={confirmando || cargandoDetalles || articulosConStock.length === 0 || hayArticuloInsuficiente}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-theme-brand-text hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmando ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Confirmando venta…</span>
              </>
            ) : (
              'Confirmar venta'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

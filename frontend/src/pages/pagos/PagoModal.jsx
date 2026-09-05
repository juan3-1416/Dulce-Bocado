import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  crearPago,
} from '../../services/pagoService'

function PagoModal({
  abierto,
  onCerrar,
  onGuardado,
  ventas,
  metodosPago,
}) {
  const [idVenta, setIdVenta] =
    useState('')

  const [monto, setMonto] =
    useState('')

  const [
    metodoPago,
    setMetodoPago,
  ] = useState('EFECTIVO')

  const [
    referencia,
    setReferencia,
  ] = useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!abierto) {
      return
    }

    setIdVenta('')
    setMonto('')
    setMetodoPago(
      metodosPago?.[0] ||
        'EFECTIVO'
    )
    setReferencia('')
    setObservaciones('')
    setError('')
  }, [abierto, metodosPago])

  const ventaSeleccionada =
    useMemo(
      () =>
        ventas.find(
          (venta) =>
            Number(
              venta.id_venta
            ) === Number(idVenta)
        ) ?? null,
      [ventas, idVenta]
    )

  const obtenerNombreCliente = (
    venta
  ) => {
    if (!venta) {
      return ''
    }

    if (venta.cliente) {
      return [
        venta.cliente.nombre,
        venta.cliente.apellido,
      ]
        .filter(Boolean)
        .join(' ')
    }

    return (
      venta.nombre_cliente_ocasional ||
      'Cliente ocasional'
    )
  }

  const manejarCambioVenta = (
    event
  ) => {
    const valor =
      event.target.value

    setIdVenta(valor)
    setMonto('')
    setError('')
  }

  const usarSaldoCompleto = () => {
    if (!ventaSeleccionada) {
      return
    }

    setMonto(
      String(
        ventaSeleccionada.saldo
      )
    )
  }

  const obtenerMensajeError = (
    errorPeticion
  ) => {
    const errores =
      errorPeticion.data?.errors

    if (errores) {
      const primerError =
        Object.values(errores)[0]

      if (
        Array.isArray(primerError)
      ) {
        return primerError[0]
      }
    }

    return (
      errorPeticion.message ||
      'No se pudo registrar el pago.'
    )
  }

  const manejarSubmit = async (
    event
  ) => {
    event.preventDefault()

    if (!idVenta) {
      setError(
        'Debe seleccionar una venta.'
      )
      return
    }

    const montoNumero =
      Number(monto)

    if (
      !Number.isFinite(
        montoNumero
      ) ||
      montoNumero <= 0
    ) {
      setError(
        'El monto debe ser mayor a cero.'
      )
      return
    }

    const saldo =
      Number(
        ventaSeleccionada?.saldo ??
          0
      )

    if (montoNumero > saldo) {
      setError(
        `El monto no puede superar el saldo pendiente de Bs ${saldo.toFixed(
          2
        )}.`
      )
      return
    }

    if (
      !['EFECTIVO', 'QR'].includes(
        metodoPago
      )
    ) {
      setError(
        'Seleccione un método de pago válido.'
      )
      return
    }

    try {
      setGuardando(true)
      setError('')

      await crearPago({
        id_venta:
          Number(idVenta),

        monto:
          montoNumero,

        metodo_pago:
          metodoPago,

        referencia:
          referencia.trim() ||
          null,

        observaciones:
          observaciones.trim() ||
          null,
      })

      await onGuardado(
        'Pago registrado correctamente.'
      )

      onCerrar()
    } catch (errorPeticion) {
      setError(
        obtenerMensajeError(
          errorPeticion
        )
      )
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Registrar Pago
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Registra un pago parcial o total de una venta.
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

        <form
          onSubmit={manejarSubmit}
          className="space-y-6 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {ventas.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No existen ventas registradas con saldo pendiente.
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="venta_pago"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Venta
                </label>

                <select
                  id="venta_pago"
                  value={idVenta}
                  onChange={
                    manejarCambioVenta
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">
                    Seleccionar venta
                  </option>

                  {ventas.map(
                    (venta) => (
                      <option
                        key={
                          venta.id_venta
                        }
                        value={
                          venta.id_venta
                        }
                      >
                        Venta #
                        {
                          venta.id_venta
                        }
                        {' — '}
                        {
                          obtenerNombreCliente(
                            venta
                          )
                        }
                        {' — Saldo Bs '}
                        {Number(
                          venta.saldo
                        ).toFixed(2)}
                      </option>
                    )
                  )}
                </select>
              </div>

              {ventaSeleccionada && (
                <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">

                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Venta
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      #
                      {
                        ventaSeleccionada.id_venta
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Total
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      Bs{' '}
                      {Number(
                        ventaSeleccionada.total
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Pagado
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      Bs{' '}
                      {Number(
                        ventaSeleccionada.total_pagado
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Saldo
                    </p>

                    <p className="mt-1 font-bold text-pink-600">
                      Bs{' '}
                      {Number(
                        ventaSeleccionada.saldo
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="monto_pago"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Monto
                    </label>

                    {ventaSeleccionada && (
                      <button
                        type="button"
                        onClick={
                          usarSaldoCompleto
                        }
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
                      max={
                        ventaSeleccionada
                          ? ventaSeleccionada.saldo
                          : undefined
                      }
                      value={monto}
                      onChange={(
                        event
                      ) =>
                        setMonto(
                          event.target.value
                        )
                      }
                      required
                      disabled={
                        !ventaSeleccionada
                      }
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 disabled:bg-gray-100"
                    />
                  </div>

                  {ventaSeleccionada && (
                    <p className="mt-1 text-xs text-gray-500">
                      Máximo: Bs{' '}
                      {Number(
                        ventaSeleccionada.saldo
                      ).toFixed(
                        2
                      )}
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
                    value={
                      metodoPago
                    }
                    onChange={(
                      event
                    ) => {
                      setMetodoPago(
                        event.target.value
                      )

                      if (
                        event.target
                          .value ===
                        'EFECTIVO'
                      ) {
                        setReferencia(
                          ''
                        )
                      }
                    }}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {metodosPago.map(
                      (metodo) => (
                        <option
                          key={metodo}
                          value={metodo}
                        >
                          {metodo ===
                          'EFECTIVO'
                            ? 'Efectivo'
                            : metodo ===
                                'QR'
                              ? 'QR'
                              : metodo}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {metodoPago ===
                'QR' && (
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
                    value={
                      referencia
                    }
                    onChange={(
                      event
                    ) =>
                      setReferencia(
                        event.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Ej. QR-001245"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Campo opcional para registrar una referencia del pago.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="observaciones_pago"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Observaciones
                </label>

                <textarea
                  id="observaciones_pago"
                  value={
                    observaciones
                  }
                  onChange={(
                    event
                  ) =>
                    setObservaciones(
                      event.target.value
                    )
                  }
                  rows={3}
                  maxLength={2000}
                  placeholder="Observaciones adicionales..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando ||
                ventas.length === 0
              }
              className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PagoModal
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  QRCodeSVG,
} from 'qrcode.react'

import {
  consultarPagoQr,
  crearPagoInternet,
} from '../../services/pagoInternetService'

function PagoInternetModal({
  abierto,
  onCerrar,
  onGuardado,
  ventas,
  proveedor,
}) {
  const [idVenta, setIdVenta] =
    useState('')

  const [monto, setMonto] =
    useState('')

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    transaccion,
    setTransaccion,
  ] = useState(null)

  const [
    estadoQr,
    setEstadoQr,
  ] = useState(null)

  const [
    segundosRestantes,
    setSegundosRestantes,
  ] = useState(0)

  const notificadoRef =
    useRef(false)

  useEffect(() => {
    if (!abierto) {
      return
    }

    setIdVenta('')
    setMonto('')
    setError('')
    setTransaccion(null)
    setEstadoQr(null)
    setSegundosRestantes(0)

    notificadoRef.current = false
  }, [abierto])

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

  const manejarCambioVenta = (
    event
  ) => {
    setIdVenta(
      event.target.value
    )

    setMonto('')
    setError('')
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
      'No se pudo iniciar el pago QR.'
    )
  }

  /*
   * URL que se codificará dentro
   * del código QR.
   */
  const urlQr = transaccion?.token_qr
    ? `${window.location.origin}/pago-qr/${transaccion.token_qr}`
    : ''

  /*
   * Cuenta regresiva visual.
   */
  useEffect(() => {
    if (
      !transaccion?.fecha_vencimiento ||
      estadoQr !== 'PENDIENTE'
    ) {
      return
    }

    const actualizarTiempo = () => {
      const vencimiento =
        new Date(
          transaccion.fecha_vencimiento
        ).getTime()

      const restante =
        Math.max(
          0,
          Math.ceil(
            (vencimiento -
              Date.now()) /
              1000
          )
        )

      setSegundosRestantes(
        restante
      )
    }

    actualizarTiempo()

    const intervalo =
      setInterval(
        actualizarTiempo,
        1000
      )

    return () =>
      clearInterval(intervalo)
  }, [
    transaccion,
    estadoQr,
  ])

  /*
   * Polling:
   * cada 2 segundos preguntamos
   * al backend si el QR ya fue
   * escaneado.
   */
  useEffect(() => {
    if (
      !transaccion?.token_qr ||
      estadoQr !== 'PENDIENTE'
    ) {
      return
    }

    let activo = true

    const consultarEstado =
      async () => {
        try {
          const respuesta =
            await consultarPagoQr(
              transaccion.token_qr
            )

          if (!activo) {
            return
          }

          const nuevoEstado =
            respuesta
              .transaccion
              ?.estado

          if (!nuevoEstado) {
            return
          }

          setEstadoQr(
            nuevoEstado
          )

          if (
            nuevoEstado ===
              'APROBADO' &&
            !notificadoRef.current
          ) {
            notificadoRef.current =
              true

            await onGuardado(
              'Pago QR confirmado correctamente. El recibo fue generado automáticamente.'
            )
          }

          if (
            nuevoEstado ===
            'VENCIDO'
          ) {
            setError(
              'El código QR venció. Inicie una nueva transacción.'
            )
          }
        } catch (errorPeticion) {
          /*
           * Un fallo aislado del polling
           * no debe destruir el QR.
           */
          console.error(
            'No se pudo consultar el estado del QR:',
            errorPeticion
          )
        }
      }

    consultarEstado()

    const intervalo =
      setInterval(
        consultarEstado,
        2000
      )

    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [
    transaccion,
    estadoQr,
    onGuardado,
  ])

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

    try {
      setGuardando(true)
      setError('')

      const respuesta =
        await crearPagoInternet({
          id_venta:
            Number(idVenta),

          monto:
            montoNumero,
        })

      const nuevaTransaccion =
        respuesta.transaccion

      setTransaccion(
        nuevaTransaccion
      )

      setEstadoQr(
        nuevaTransaccion.estado ||
          'PENDIENTE'
      )

      /*
       * Actualiza la tabla de fondo,
       * pero NO cerramos el modal.
       */
      await onGuardado(
        'Código QR generado. Esperando confirmación del pago.'
      )
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

  const formatearTiempo = (
    totalSegundos
  ) => {
    const minutos =
      Math.floor(
        totalSegundos / 60
      )

    const segundos =
      totalSegundos % 60

    return `${String(
      minutos
    ).padStart(
      2,
      '0'
    )}:${String(
      segundos
    ).padStart(
      2,
      '0'
    )}`
  }

  if (!abierto) {
    return null
  }

  const aprobado =
    estadoQr === 'APROBADO'

  const vencido =
    estadoQr === 'VENCIDO'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Pago mediante QR
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Simulación académica de una
              pasarela de pago.
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

        {!transaccion ? (
          <form
            onSubmit={manejarSubmit}
            className="space-y-6 p-6"
          >

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

              <p className="text-sm text-blue-800">
                Proveedor simulado:
              </p>

              <p className="mt-1 font-semibold text-blue-900">
                {proveedor ||
                  'QR_SIMULADO'}
              </p>

              <p className="mt-2 text-xs text-blue-700">
                El pago se confirmará cuando
                el cliente abra el código QR.
              </p>
            </div>

            {ventas.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No existen ventas disponibles
                con saldo pendiente.
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="venta_online"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Venta
                  </label>

                  <select
                    id="venta_online"
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
                        ).toFixed(2)}
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
                        ).toFixed(2)}
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
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between">

                    <label
                      htmlFor="monto_online"
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
                      id="monto_online"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={
                        ventaSeleccionada
                          ? ventaSeleccionada.saldo
                          : undefined
                      }
                      value={monto}
                      onChange={(event) =>
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
                  ? 'Generando...'
                  : 'Generar QR'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 p-6">

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="text-center">

              <p className="text-sm text-gray-500">
                Venta #
                {
                  transaccion.id_venta
                }
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                Bs{' '}
                {Number(
                  transaccion.monto
                ).toFixed(2)}
              </p>
            </div>

            {!aprobado &&
              !vencido && (
                <>
                  <div className="mx-auto flex w-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

                    <QRCodeSVG
                      value={urlQr}
                      size={250}
                      level="M"
                      includeMargin
                    />
                  </div>

                  <div className="text-center">

                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />

                      Esperando pago...
                    </div>

                    <p className="mt-3 text-sm text-gray-500">
                      Escanea el código con
                      un teléfono.
                    </p>

                    <p className="mt-2 text-lg font-bold text-gray-800">
                      Vence en{' '}
                      {formatearTiempo(
                        segundosRestantes
                      )}
                    </p>
                  </div>
                </>
              )}

            {aprobado && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">

                <div className="text-5xl">
                  ✅
                </div>

                <h3 className="mt-3 text-xl font-bold text-green-800">
                  Pago confirmado
                </h3>

                <p className="mt-2 text-sm text-green-700">
                  El pago fue registrado y
                  el recibo se generó
                  automáticamente.
                </p>
              </div>
            )}

            {vencido && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">

                <div className="text-5xl">
                  ⌛
                </div>

                <h3 className="mt-3 text-xl font-bold text-amber-800">
                  QR vencido
                </h3>

                <p className="mt-2 text-sm text-amber-700">
                  Cierra esta ventana e
                  inicia un nuevo pago.
                </p>
              </div>
            )}

            <div className="rounded-xl bg-gray-50 p-4">

              <p className="text-xs font-medium uppercase text-gray-400">
                Referencia
              </p>

              <p className="mt-1 break-all text-sm text-gray-700">
                {
                  transaccion.referencia_transaccion
                }
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700">
              Simulación académica: el
              escaneo del QR representa la
              confirmación que en un entorno
              real enviaría una entidad
              financiera o pasarela de pago.
            </div>

            {window.location.hostname ===
              'localhost' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Para escanear desde un celular
                real tendremos que abrir el
                sistema usando la IP local de
                esta computadora. Primero
                probaremos el flujo desde el
                navegador.
              </div>
            )}

            <div className="flex justify-end border-t border-gray-200 pt-5">

              <button
                type="button"
                onClick={onCerrar}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700"
              >
                {aprobado
                  ? 'Finalizar'
                  : 'Cerrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PagoInternetModal
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'


import {
  crearPago,
} from '../../services/pagoService'

import {
  crearPagoInternet,
  obtenerPagoInternet,
} from '../../services/pagoInternetService'

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
  const [tipoCobro, setTipoCobro] =
    useState('venta')

  const [idVenta, setIdVenta] =
    useState('')

  const [idPedido, setIdPedido] =
    useState('')

  const [monto, setMonto] =
    useState('')

  const [metodoPago, setMetodoPago] =
    useState('EFECTIVO')

  const [referencia, setReferencia] =
    useState('')

  const [observaciones, setObservaciones] =
    useState('')

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    transaccionQr,
    setTransaccionQr,
  ] = useState(null)

  const [
    estadoQr,
    setEstadoQr,
  ] = useState(null)

  const [
    consultandoQr,
    setConsultandoQr,
  ] = useState(false)

  const timeoutQrRef =
    useRef(null)

  const qrNotificadoRef =
    useRef(false)

  useEffect(() => {
    if (!abierto) return

    if (timeoutQrRef.current) {
      clearTimeout(
        timeoutQrRef.current
      )

      timeoutQrRef.current = null
    }

    setIdVenta('')
    setIdPedido('')
    setMonto('')

    setMetodoPago(
      metodosPago?.[0] ||
        'EFECTIVO'
    )

    setReferencia('')
    setObservaciones('')
    setError('')

    setTransaccionQr(null)
    setEstadoQr(null)
    setConsultandoQr(false)

    qrNotificadoRef.current =
      false

    if (
      pedidoSeleccionadoInicial
    ) {
      setTipoCobro('pedido')

      setIdPedido(
        String(
          pedidoSeleccionadoInicial.id_pedido
        )
      )

      setMonto(
        String(
          pedidoSeleccionadoInicial.saldo
        )
      )

      return
    }

    if (ventaInicialId) {
      const ventaInicial =
        ventas.find(
          (venta) =>
            Number(
              venta.id_venta
            ) ===
            Number(
              ventaInicialId
            )
        )

      setTipoCobro('venta')

      setIdVenta(
        String(
          ventaInicialId
        )
      )

      if (ventaInicial) {
        setMonto(
          String(
            ventaInicial.saldo
          )
        )
      }

      return
    }

    if (
      pedidos.length > 0 &&
      ventas.length === 0
    ) {
      setTipoCobro('pedido')
    } else {
      setTipoCobro('venta')
    }
  }, [
    abierto,
    metodosPago,
    ventaInicialId,
    pedidoSeleccionadoInicial,
    ventas,
    pedidos,
  ])

  useEffect(() => {
    return () => {
      if (
        timeoutQrRef.current
      ) {
        clearTimeout(
          timeoutQrRef.current
        )
      }
    }
  }, [])

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

  const pedidoSeleccionado =
    useMemo(
      () =>
        pedidos.find(
          (pedido) =>
            Number(
              pedido.id_pedido
            ) === Number(idPedido)
        ) ?? null,
      [pedidos, idPedido]
    )

  const documentoSeleccionado =
    tipoCobro === 'venta'
      ? ventaSeleccionada
      : pedidoSeleccionado

  const obtenerNombreCliente = (
    documento
  ) => {
    if (!documento) {
      return ''
    }

    if (documento.cliente) {
      return [
        documento.cliente.nombre,
        documento.cliente.apellido,
      ]
        .filter(Boolean)
        .join(' ')
    }

    return (
      documento.nombre_cliente_ocasional ||
      'Cliente ocasional'
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

  const manejarCambioPedido = (
    event
  ) => {
    setIdPedido(
      event.target.value
    )

    setMonto('')
    setError('')
  }

  const usarSaldoCompleto = () => {
    if (
      documentoSeleccionado
    ) {
      setMonto(
        String(
          documentoSeleccionado.saldo
        )
      )
    }
  }

  const obtenerMensajeError = (
    errorPeticion
  ) => {
    const errores =
      errorPeticion.data?.errors

    if (errores) {
      const primerError =
        Object.values(
          errores
        )[0]

      if (
        Array.isArray(
          primerError
        )
      ) {
        return primerError[0]
      }
    }

    return (
      errorPeticion.message ||
      'No se pudo procesar el pago.'
    )
  }

  /*
   * Polling del estado almacenado en nuestro backend.
   *
   * El frontend NO consulta el estado directamente
   * en Libélula. Libélula confirma el pago mediante
   * el aviso GET público y nuestro backend actualiza
   * la transacción.
   */
  useEffect(() => {
    if (
      !abierto ||
      !transaccionQr
        ?.id_pago_internet ||
      estadoQr !==
        'PENDIENTE'
    ) {
      return
    }

    let cancelado = false

    const idTransaccion =
      transaccionQr
        .id_pago_internet

    const verificarEstado =
      async () => {
        let continuar = true

        try {
          setConsultandoQr(
            true
          )

          const detalle =
            await obtenerPagoInternet(
              idTransaccion
            )

          if (cancelado) {
            return
          }

          const transaccion =
            detalle
              .transaccion

          const nuevoEstado =
            transaccion
              ?.estado

          if (!nuevoEstado) {
            return
          }

          if (
            nuevoEstado ===
            'APROBADO'
          ) {
            continuar = false

            if (
              qrNotificadoRef
                .current
            ) {
              return
            }

            qrNotificadoRef.current =
              true

            const pago =
              transaccion
                ?.pago ??
              null

            if (!pago?.id_pago) {
              throw new Error(
                'El pago QR fue aprobado, pero no se pudo recuperar el pago generado.'
              )
            }

            await onGuardado(
              'Pago QR confirmado correctamente. El recibo fue generado automáticamente.',
              pago,
              {
                flujo: 'QR',
                recibo_generado:
                  true,
              }
            )

            setEstadoQr(
              'APROBADO'
            )

            onCerrar()
            return
          }

          setEstadoQr(
            nuevoEstado
          )

          if (
            nuevoEstado ===
            'RECHAZADO'
          ) {
            continuar = false

            setError(
              transaccion
                ?.motivo_rechazo ||
              'El pago QR fue rechazado.'
            )
          }

          if (
            nuevoEstado ===
            'VENCIDO'
          ) {
            continuar = false

            setError(
              'La transacción QR ya no está disponible.'
            )
          }
        } catch (
          errorPeticion
        ) {
          console.error(
            'Error al consultar el estado del pago QR:',
            errorPeticion
          )
        } finally {
          if (!cancelado) {
            setConsultandoQr(
              false
            )
          }
        }

        if (
          !cancelado &&
          continuar
        ) {
          timeoutQrRef.current =
            setTimeout(
              verificarEstado,
              5000
            )
        }
      }

    verificarEstado()

    return () => {
      cancelado = true

      if (
        timeoutQrRef.current
      ) {
        clearTimeout(
          timeoutQrRef.current
        )

        timeoutQrRef.current =
          null
      }
    }
  }, [
    abierto,
    transaccionQr,
    estadoQr,
    onGuardado,
    onCerrar,
  ])

  const manejarSubmit = async (
    event
  ) => {
    event.preventDefault()

    if (
      tipoCobro ===
        'venta' &&
      !idVenta
    ) {
      setError(
        'Debe seleccionar una venta.'
      )
      return
    }

    if (
      tipoCobro ===
        'pedido' &&
      !idPedido
    ) {
      setError(
        'Debe seleccionar un pedido.'
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
        documentoSeleccionado
          ?.saldo ?? 0
      )

    if (
      montoNumero > saldo
    ) {
      setError(
        `El monto no puede superar el saldo pendiente de Bs ${saldo.toFixed(
          2
        )}.`
      )
      return
    }

    if (
      ![
        'EFECTIVO',
        'QR',
      ].includes(
        metodoPago
      )
    ) {
      setError(
        'Seleccione un método de pago válido.'
      )
      return
    }

    /*
     * QR real mediante Libélula.
     */
    if (
      metodoPago === 'QR'
    ) {
      if (
        tipoCobro !== 'venta'
      ) {
        setError(
          'El pago mediante QR de la pasarela está habilitado actualmente para ventas.'
        )

        return
      }

      try {
        setGuardando(true)
        setError('')

        const respuesta =
          await crearPagoInternet(
            {
              id_venta:
                Number(
                  idVenta
                ),

              monto:
                montoNumero,
            }
          )

        const transaccion =
          respuesta.transaccion

        if (
          !transaccion
            ?.qr_simple_url
        ) {
          throw new Error(
            'Libélula no devolvió una imagen QR válida.'
          )
        }

        qrNotificadoRef.current =
          false

        setTransaccionQr(
          transaccion
        )

        setEstadoQr(
          transaccion.estado ||
            'PENDIENTE'
        )

        setReferencia('')
      } catch (
        errorPeticion
      ) {
        setError(
          obtenerMensajeError(
            errorPeticion
          )
        )
      } finally {
        setGuardando(false)
      }

      return
    }

    /*
     * Pago normal en efectivo.
     */
    try {
      setGuardando(true)
      setError('')

      const payload = {
        monto:
          montoNumero,

        metodo_pago:
          'EFECTIVO',

        referencia:
          referencia.trim() ||
          null,

        observaciones:
          observaciones.trim() ||
          null,
      }

      if (
        tipoCobro ===
        'venta'
      ) {
        payload.id_venta =
          Number(idVenta)
      } else {
        payload.id_pedido =
          Number(idPedido)
      }

      const respuesta =
        await crearPago(
          payload
        )

      await onGuardado(
        respuesta?.message ||
          'Pago registrado correctamente.',
        respuesta?.pago ??
          null,
        {
          flujo:
            'EFECTIVO',
          recibo_generado:
            false,
        }
      )

      onCerrar()
    } catch (
      errorPeticion
    ) {
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

  const qrPendiente =
    estadoQr ===
    'PENDIENTE'

  const qrAprobado =
    estadoQr ===
    'APROBADO'

  const qrVencido =
    estadoQr ===
    'VENCIDO'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

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
            disabled={
              guardando
            }
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {transaccionQr ? (
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
                  transaccionQr.id_venta
                }
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                Bs{' '}
                {Number(
                  transaccionQr.monto
                ).toFixed(
                  2
                )}
              </p>
            </div>

            {qrPendiente && (
              <>
                <div className="mx-auto flex w-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <img
                    src={
                      transaccionQr
                        .qr_simple_url
                    }
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

                <div className="text-5xl">
                  ✅
                </div>

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

                <div className="text-5xl">
                  ⌛
                </div>

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
                {
                  transaccionQr.referencia_transaccion
                }
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
        ) : (
          <form
            onSubmit={
              manejarSubmit
            }
            className="space-y-6 p-6"
          >

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {ventas.length ===
              0 &&
            pedidos.length ===
              0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No existen comprobantes registrados con saldo pendiente.
              </div>
            ) : (
              <>
                <PagoDocumentoSelector
                  tipoCobro={
                    tipoCobro
                  }
                  setTipoCobro={
                    setTipoCobro
                  }
                  idVenta={
                    idVenta
                  }
                  idPedido={
                    idPedido
                  }
                  ventas={
                    ventas
                  }
                  pedidos={
                    pedidos
                  }
                  manejarCambioVenta={
                    manejarCambioVenta
                  }
                  manejarCambioPedido={
                    manejarCambioPedido
                  }
                  obtenerNombreCliente={
                    obtenerNombreCliente
                  }
                />

                <PagoResumenDocumento
                  tipoCobro={
                    tipoCobro
                  }
                  documentoSeleccionado={
                    documentoSeleccionado
                  }
                />

                <PagoFormularioCampos
                  monto={monto}
                  setMonto={
                    setMonto
                  }
                  metodoPago={
                    metodoPago
                  }
                  setMetodoPago={(
                    nuevoMetodo
                  ) => {
                    setMetodoPago(
                      nuevoMetodo
                    )

                    setReferencia(
                      ''
                    )

                    setError('')
                  }}
                  referencia={
                    referencia
                  }
                  setReferencia={
                    setReferencia
                  }
                  observaciones={
                    observaciones
                  }
                  setObservaciones={
                    setObservaciones
                  }
                  metodosPago={
                    metodosPago
                  }
                  documentoSeleccionado={
                    documentoSeleccionado
                  }
                  usarSaldoCompleto={
                    usarSaldoCompleto
                  }
                />
              </>
            )}

            {metodoPago ===
              'QR' &&
              tipoCobro ===
                'venta' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  Al continuar se generará un QR real de Libélula. El pago solo será registrado cuando Libélula confirme la transacción.
                </div>
              )}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

              <button
                type="button"
                onClick={
                  onCerrar
                }
                disabled={
                  guardando
                }
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  guardando ||
                  (
                    ventas.length ===
                      0 &&
                    pedidos.length ===
                      0
                  )
                }
                className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? metodoPago ===
                      'QR'
                    ? 'Generando QR...'
                    : 'Registrando...'
                  : metodoPago ===
                      'QR'
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
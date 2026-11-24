import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import PagoInternetModal from './PagoInternetModal'

import {
  confirmarPagoInternet,
  listarPagosInternet,
  obtenerCatalogosPagoInternet,
} from '../../services/pagoInternetService'

function PagosInternetPage() {
  const [
    transacciones,
    setTransacciones,
  ] = useState([])

  const [buscar, setBuscar] =
    useState('')

  const [estado, setEstado] =
    useState('')

  const [ventas, setVentas] =
    useState([])

  const [
    proveedor,
    setProveedor,
  ] = useState(
    'PASARELA_SIMULADA'
  )

  const [
    modalAbierto,
    setModalAbierto,
  ] = useState(false)

  const [
    transaccionSeleccionada,
    setTransaccionSeleccionada,
  ] = useState(null)

  const [
    resultadoConfirmacion,
    setResultadoConfirmacion,
  ] = useState(null)

  const [
    motivoRechazo,
    setMotivoRechazo,
  ] = useState('')

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(false)

  const [
    confirmando,
    setConfirmando,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarTransacciones =
    useCallback(async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta =
          await listarPagosInternet({
            buscar,
            estado,
          })

        setTransacciones(
          respuesta.transacciones ??
            []
        )
      } catch (errorPeticion) {
        if (
          errorPeticion.status ===
          403
        ) {
          setError(
            'No tienes permiso para gestionar pagos por internet.'
          )
        } else if (
          errorPeticion.status ===
          401
        ) {
          setError(
            'Tu sesión ha expirado.'
          )
        } else {
          setError(
            errorPeticion.message ||
              'No se pudieron cargar los pagos por internet.'
          )
        }
      } finally {
        setCargando(false)
      }
    }, [
      buscar,
      estado,
    ])

  const cargarCatalogos =
    useCallback(async () => {
      const respuesta =
        await obtenerCatalogosPagoInternet()

      setVentas(
        respuesta.ventas ?? []
      )

      setProveedor(
        respuesta.proveedor ||
          'PASARELA_SIMULADA'
      )
    }, [])

  useEffect(() => {
    const temporizador =
      setTimeout(() => {
        cargarTransacciones()
      }, 300)

    return () =>
      clearTimeout(temporizador)
  }, [cargarTransacciones])

  const abrirNuevoPago =
    async () => {
      try {
        setCargandoCatalogos(true)
        setError('')
        setMensaje('')

        await cargarCatalogos()

        setModalAbierto(true)
      } catch (errorPeticion) {
        setError(
          errorPeticion.message ||
            'No se pudieron cargar las ventas disponibles.'
        )
      } finally {
        setCargandoCatalogos(false)
      }
    }

  const cerrarModal = () => {
    setModalAbierto(false)
  }

  const manejarGuardado = async (
    mensajeRespuesta
  ) => {
    setMensaje(
      mensajeRespuesta
    )

    await cargarTransacciones()
  }

  const abrirConfirmacion = (
    transaccion,
    resultado
  ) => {
    if (
      transaccion.estado !==
      'PENDIENTE'
    ) {
      setError(
        'La transacción ya fue procesada.'
      )
      return
    }

    setError('')
    setMensaje('')

    setTransaccionSeleccionada(
      transaccion
    )

    setResultadoConfirmacion(
      resultado
    )

    setMotivoRechazo('')
  }

  const cerrarConfirmacion = () => {
    if (confirmando) {
      return
    }

    setTransaccionSeleccionada(
      null
    )

    setResultadoConfirmacion(
      null
    )

    setMotivoRechazo('')
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
      'No se pudo confirmar la transacción.'
    )
  }

  const confirmarTransaccion =
    async () => {
      if (
        !transaccionSeleccionada ||
        !resultadoConfirmacion
      ) {
        return
      }

      if (
        resultadoConfirmacion ===
          'RECHAZADO' &&
        motivoRechazo.trim()
          .length < 5
      ) {
        setError(
          'El motivo de rechazo debe tener al menos 5 caracteres.'
        )
        return
      }

      try {
        setConfirmando(true)
        setError('')

        const datos = {
          resultado:
            resultadoConfirmacion,
        }

        if (
          resultadoConfirmacion ===
          'RECHAZADO'
        ) {
          datos.motivo_rechazo =
            motivoRechazo.trim()
        }

        await confirmarPagoInternet(
          transaccionSeleccionada
            .id_pago_internet,
          datos
        )

        setMensaje(
          resultadoConfirmacion ===
          'APROBADO'
            ? 'Pago por internet aprobado correctamente.'
            : 'Pago por internet rechazado correctamente.'
        )

        setTransaccionSeleccionada(
          null
        )

        setResultadoConfirmacion(
          null
        )

        setMotivoRechazo('')

        await cargarTransacciones()
      } catch (errorPeticion) {
        setError(
          obtenerMensajeError(
            errorPeticion
          )
        )
      } finally {
        setConfirmando(false)
      }
    }

  const obtenerNombreCliente = (
    transaccion
  ) => {
    const venta =
      transaccion.venta

    if (!venta) {
      return '—'
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

  const obtenerNombreUsuario = (
    usuario
  ) => {
    if (!usuario) {
      return '—'
    }

    return (
      usuario.nombre ||
      usuario.nombre_usuario ||
      '—'
    )
  }

  const formatearFecha = (
    fecha
  ) => {
    if (!fecha) {
      return '—'
    }

    return new Date(
      fecha
    ).toLocaleString(
      'es-BO'
    )
  }

  const claseEstado = (
    estadoTransaccion
  ) => {
    switch (
      estadoTransaccion
    ) {
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-700'

      case 'APROBADO':
        return 'bg-green-100 text-green-700'

      case 'RECHAZADO':
        return 'bg-red-100 text-red-700'

      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <section className="space-y-6">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pagos por Internet
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gestiona las transacciones realizadas mediante un proveedor de pagos externo.
          </p>
        </div>

        <button
          type="button"
          onClick={
            abrirNuevoPago
          }
          disabled={
            cargandoCatalogos
          }
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoCatalogos
            ? 'Cargando...'
            : 'Nuevo Pago Online'}
        </button>
      </div>

      {mensaje && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">

        <div>
          <label
            htmlFor="buscar_pago_internet"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Buscar
          </label>

          <input
            id="buscar_pago_internet"
            type="text"
            value={buscar}
            onChange={(event) =>
              setBuscar(
                event.target.value
              )
            }
            placeholder="Cliente, referencia o proveedor..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>

        <div>
          <label
            htmlFor="estado_pago_internet"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Estado
          </label>

          <select
            id="estado_pago_internet"
            value={estado}
            onChange={(event) =>
              setEstado(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">
              Todos
            </option>

            <option value="PENDIENTE">
              Pendientes
            </option>

            <option value="APROBADO">
              Aprobados
            </option>

            <option value="RECHAZADO">
              Rechazados
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando transacciones...
          </div>
        ) : transacciones.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No existen transacciones de pago por internet.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-gray-200">

              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    N.º
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Venta
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Monto
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Referencia
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">

                {transacciones.map(
                  (transaccion) => (
                    <tr
                      key={
                        transaccion.id_pago_internet
                      }
                      className="align-top hover:bg-gray-50"
                    >

                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        #
                        {
                          transaccion.id_pago_internet
                        }
                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-gray-900">
                          Venta #
                          {
                            transaccion.id_venta
                          }
                        </p>

                        {transaccion.id_pago && (
                          <p className="mt-1 text-xs text-green-600">
                            Pago generado #
                            {
                              transaccion.id_pago
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-gray-900">
                          {obtenerNombreCliente(
                            transaccion
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Iniciado por:{' '}
                          {obtenerNombreUsuario(
                            transaccion.usuario
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm font-bold text-gray-900">
                          Bs{' '}
                          {Number(
                            transaccion.monto
                          ).toFixed(
                            2
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            transaccion.proveedor
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">

                        <p className="max-w-[220px] break-all text-xs text-gray-600">
                          {
                            transaccion.referencia_transaccion
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${claseEstado(
                            transaccion.estado
                          )}`}
                        >
                          {
                            transaccion.estado
                          }
                        </span>

                        {transaccion.estado ===
                          'RECHAZADO' &&
                          transaccion.motivo_rechazo && (
                            <p className="mt-2 max-w-xs text-xs text-red-600">
                              {
                                transaccion.motivo_rechazo
                              }
                            </p>
                          )}
                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm text-gray-600">
                          Solicitud:
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatearFecha(
                            transaccion.fecha_solicitud
                          )}
                        </p>

                        {transaccion.fecha_confirmacion && (
                          <>
                            <p className="mt-2 text-sm text-gray-600">
                              Confirmación:
                            </p>

                            <p className="text-xs text-gray-500">
                              {formatearFecha(
                                transaccion.fecha_confirmacion
                              )}
                            </p>
                          </>
                        )}
                      </td>

                      <td className="px-5 py-4">

                        {transaccion.estado ===
                        'PENDIENTE' ? (
                          <div className="flex flex-wrap gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                abrirConfirmacion(
                                  transaccion,
                                  'APROBADO'
                                )
                              }
                              className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                abrirConfirmacion(
                                  transaccion,
                                  'RECHAZADO'
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Procesada
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PagoInternetModal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        onGuardado={
          manejarGuardado
        }
        ventas={ventas}
        proveedor={proveedor}
      />

      {transaccionSeleccionada &&
        resultadoConfirmacion && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">

            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

              <div className="border-b border-gray-200 px-6 py-4">

                <h2 className="text-xl font-bold text-gray-900">
                  {resultadoConfirmacion ===
                  'APROBADO'
                    ? 'Aprobar Transacción'
                    : 'Rechazar Transacción'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Transacción #
                  {
                    transaccionSeleccionada.id_pago_internet
                  }
                  {' — Bs '}
                  {Number(
                    transaccionSeleccionada.monto
                  ).toFixed(
                    2
                  )}
                </p>
              </div>

              <div className="space-y-5 p-6">

                {resultadoConfirmacion ===
                'APROBADO' ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    Al aprobar la transacción se generará automáticamente un pago con método ONLINE.
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      Una transacción rechazada no generará ningún pago financiero.
                    </div>

                    <div>
                      <label
                        htmlFor="motivo_rechazo_online"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Motivo del rechazo
                      </label>

                      <textarea
                        id="motivo_rechazo_online"
                        value={
                          motivoRechazo
                        }
                        onChange={(event) =>
                          setMotivoRechazo(
                            event.target.value
                          )
                        }
                        rows={4}
                        maxLength={500}
                        placeholder="Explique el motivo del rechazo..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />

                      <p className="mt-1 text-xs text-gray-400">
                        Mínimo 5 caracteres.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                  <button
                    type="button"
                    onClick={
                      cerrarConfirmacion
                    }
                    disabled={
                      confirmando
                    }
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={
                      confirmarTransaccion
                    }
                    disabled={
                      confirmando ||
                      (
                        resultadoConfirmacion ===
                          'RECHAZADO' &&
                        motivoRechazo
                          .trim()
                          .length < 5
                      )
                    }
                    className={
                      resultadoConfirmacion ===
                      'APROBADO'
                        ? 'rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50'
                        : 'rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'
                    }
                  >
                    {confirmando
                      ? 'Procesando...'
                      : resultadoConfirmacion ===
                          'APROBADO'
                        ? 'Confirmar Aprobación'
                        : 'Confirmar Rechazo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  )
}

export default PagosInternetPage
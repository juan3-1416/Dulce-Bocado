import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import PagoModal from './PagoModal'
import ReciboDetalleModal from '../recibos/ReciboDetalleModal'

import {
  anularPago,
  listarPagos,
  obtenerCatalogosPago,
} from '../../services/pagoService'

function PagosPage() {
  const [pagos, setPagos] = useState([])
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')

  const [
    metodoPagoFiltro,
    setMetodoPagoFiltro,
  ] = useState('')

  const [ventas, setVentas] = useState([])
  const [pedidos, setPedidos] = useState([])

  const [
    metodosPago,
    setMetodosPago,
  ] = useState([
    'EFECTIVO',
    'QR',
  ])

  const [
    reciboSeleccionado,
    setReciboSeleccionado,
  ] = useState(null)

  const [
    modalAbierto,
    setModalAbierto,
  ] = useState(false)

  const [
    pagoParaAnular,
    setPagoParaAnular,
  ] = useState(null)

  const [
    motivoAnulacion,
    setMotivoAnulacion,
  ] = useState('')

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(false)

  const [anulando, setAnulando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarPagos =
    useCallback(async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta =
          await listarPagos({
            buscar,
            estado,
            metodo_pago:
              metodoPagoFiltro,
          })

        setPagos(
          respuesta.pagos ?? []
        )
      } catch (errorPeticion) {
        if (
          errorPeticion.status ===
          403
        ) {
          setError(
            'No tienes permiso para gestionar pagos.'
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
              'No se pudieron cargar los pagos.'
          )
        }
      } finally {
        setCargando(false)
      }
    }, [
      buscar,
      estado,
      metodoPagoFiltro,
    ])

  const cargarCatalogos =
    useCallback(async () => {
      const respuesta =
        await obtenerCatalogosPago()

      setVentas(
        respuesta.ventas ?? []
      )

      setPedidos(
        respuesta.pedidos ?? []
      )

      setMetodosPago(
        respuesta.metodos_pago ??
          [
            'EFECTIVO',
            'QR',
          ]
      )
    }, [])

  useEffect(() => {
    const temporizador =
      setTimeout(() => {
        cargarPagos()
      }, 300)

    return () =>
      clearTimeout(temporizador)
  }, [cargarPagos])

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
            'No se pudieron cargar las ventas y pedidos disponibles.'
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

    await cargarPagos()
  }

  const abrirModalAnular = (
    pago
  ) => {
    if (
      pago.estado ===
      'ANULADO'
    ) {
      setError(
        'El pago ya se encuentra anulado.'
      )
      return
    }

    setError('')
    setMensaje('')

    setPagoParaAnular(pago)
    setMotivoAnulacion('')
  }

  const cerrarModalAnular = () => {
    if (anulando) {
      return
    }

    setPagoParaAnular(null)
    setMotivoAnulacion('')
  }

  const confirmarAnulacion =
    async () => {
      const motivo =
        motivoAnulacion.trim()

      if (motivo.length < 5) {
        setError(
          'El motivo de anulación debe tener al menos 5 caracteres.'
        )
        return
      }

      try {
        setAnulando(true)
        setError('')

        await anularPago(
          pagoParaAnular.id_pago,
          motivo
        )

        setMensaje(
          'Pago anulado correctamente.'
        )

        setPagoParaAnular(null)
        setMotivoAnulacion('')

        await cargarPagos()
      } catch (errorPeticion) {
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
            setError(
              primerError[0]
            )
          } else {
            setError(
              errorPeticion.message
            )
          }
        } else {
          setError(
            errorPeticion.message ||
              'No se pudo anular el pago.'
          )
        }
      } finally {
        setAnulando(false)
      }
    }

  const obtenerNombreCliente = (
    pago
  ) => {
    const documento =
      pago.venta || pago.pedido

    if (!documento) {
      return '—'
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

  const obtenerDocumentoPago = (
    pago
  ) => {
    if (pago.venta) {
      return {
        tipo: 'Venta',
        numero: pago.id_venta,
        documento: pago.venta,
      }
    }

    if (pago.pedido) {
      return {
        tipo: 'Pedido',
        numero: pago.id_pedido,
        documento: pago.pedido,
      }
    }

    return {
      tipo: '—',
      numero: null,
      documento: null,
    }
  }

  const abrirReciboPago = (
    pago
  ) => {
    const recibos =
      pago.recibos ?? []

    const recibo =
      recibos.find(
        (item) =>
          item.estado === 'EMITIDO'
      ) ?? recibos[0]

    if (!recibo?.id_recibo) {
      setError(
        'No se encontró un recibo asociado a este pago.'
      )
      return
    }

    setError('')
    setReciboSeleccionado(
      recibo.id_recibo
    )
  }

  const obtenerResumenPago = (
    pago
  ) => {
    const { documento } =
      obtenerDocumentoPago(pago)

    if (!documento) {
      return {
        total: 0,
        pagadoHastaPago: null,
        saldoDespuesPago: null,
      }
    }

    return {
      total: Number(
        documento.total ?? 0
      ),

      pagadoHastaPago:
        pago.total_pagado_hasta_pago !== null &&
        pago.total_pagado_hasta_pago !== undefined
          ? Number(
              pago.total_pagado_hasta_pago
            )
          : null,

      saldoDespuesPago:
        pago.saldo_despues_pago !== null &&
        pago.saldo_despues_pago !== undefined
          ? Number(
              pago.saldo_despues_pago
            )
          : null,
    }
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

  const formatearMetodo = (
    metodo
  ) => {
    switch (metodo) {
      case 'EFECTIVO':
        return 'Efectivo'

      case 'QR':
        return 'QR'

      case 'ONLINE':
        return 'QR - Libélula'

      default:
        return metodo
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Pagos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Registra y controla los pagos asociados a ventas y pedidos.
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
            : 'Nuevo Pago'}
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

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div>
          <label
            htmlFor="buscar_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Buscar
          </label>

          <input
            id="buscar_pago"
            type="text"
            value={buscar}
            onChange={(event) =>
              setBuscar(
                event.target.value
              )
            }
            placeholder="Cliente o referencia..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>

        <div>
          <label
            htmlFor="estado_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Estado
          </label>

          <select
            id="estado_pago"
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

            <option value="REGISTRADO">
              Registrados
            </option>

            <option value="ANULADO">
              Anulados
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="metodo_pago_filtro"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Método
          </label>

          <select
            id="metodo_pago_filtro"
            value={
              metodoPagoFiltro
            }
            onChange={(event) =>
              setMetodoPagoFiltro(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">
              Todos
            </option>

            <option value="EFECTIVO">
              Efectivo
            </option>

            <option value="QR">
              QR
            </option>

            <option value="ONLINE">
              QR - Libélula
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando pagos...
          </div>
        ) : pagos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No existen pagos registrados.
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
                    Origen
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Monto
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Método
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {pagos.map(
                  (pago) => {
                    const origen =
                      obtenerDocumentoPago(
                        pago
                      )

                    const resumen =
                      obtenerResumenPago(
                        pago
                      )

                    return (
                      <tr
                        key={
                          pago.id_pago
                        }
                        className="align-top hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                          #{pago.id_pago}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {origen.tipo}
                            {origen.numero
                              ? ` #${origen.numero}`
                              : ''}
                          </p>

                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p>
                              Total: Bs{' '}
                              {resumen.total.toFixed(
                                2
                              )}
                            </p>

                            {pago.estado ===
                            'REGISTRADO' ? (
                              <>
                                <p className="text-green-700">
                                  Pagado hasta este pago: Bs{' '}
                                  {resumen.pagadoHastaPago !==
                                  null
                                    ? resumen.pagadoHastaPago.toFixed(
                                        2
                                      )
                                    : '0.00'}
                                </p>

                                <p
                                  className={
                                    resumen.saldoDespuesPago >
                                    0
                                      ? 'font-semibold text-amber-700'
                                      : 'font-semibold text-green-700'
                                  }
                                >
                                  Saldo después del pago: Bs{' '}
                                  {resumen.saldoDespuesPago !==
                                  null
                                    ? resumen.saldoDespuesPago.toFixed(
                                        2
                                      )
                                    : '0.00'}
                                </p>
                              </>
                            ) : (
                              <p className="text-red-600">
                                Pago anulado — no afecta el saldo vigente
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {obtenerNombreCliente(
                              pago
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Registrado por:{' '}
                            {obtenerNombreUsuario(
                              pago.usuario
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-gray-900">
                            Bs{' '}
                            {Number(
                              pago.monto
                            ).toFixed(
                              2
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-700">
                            {formatearMetodo(
                              pago.metodo_pago
                            )}
                          </p>

                          {pago.referencia && (
                            <p className="mt-1 max-w-[220px] break-all text-xs text-gray-500">
                              Ref:{' '}
                              {pago.referencia}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatearFecha(
                            pago.fecha_pago
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {pago.estado ===
                          'REGISTRADO' ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Registrado
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Anulado
                              </span>

                              {pago.motivo_anulacion && (
                                <p className="mt-2 max-w-xs text-xs text-gray-500">
                                  {
                                    pago.motivo_anulacion
                                  }
                                </p>
                              )}

                              {pago.fecha_anulacion && (
                                <p className="mt-1 text-xs text-gray-400">
                                  {formatearFecha(
                                    pago.fecha_anulacion
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(pago.recibos
                              ?.length ??
                              0) > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirReciboPago(
                                    pago
                                  )
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Ver recibo
                              </button>
                            ) : (
                              <span className="inline-flex items-center text-xs text-gray-400">
                                Sin recibo
                              </span>
                            )}

                            {pago.estado ===
                              'REGISTRADO' && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalAnular(
                                    pago
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PagoModal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        onGuardado={
          manejarGuardado
        }
        ventas={ventas}
        pedidos={pedidos}
        metodosPago={
          metodosPago
        }
      />

      <ReciboDetalleModal
        abierto={Boolean(
          reciboSeleccionado
        )}
        reciboId={
          reciboSeleccionado
        }
        onCerrar={() =>
          setReciboSeleccionado(
            null
          )
        }
        onActualizado={
          cargarPagos
        }
      />

      {pagoParaAnular && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                Anular Pago
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Pago #
                {
                  pagoParaAnular.id_pago
                }
                {' — '}
                {pagoParaAnular.id_pedido
                  ? `Pedido #${pagoParaAnular.id_pedido}`
                  : `Venta #${pagoParaAnular.id_venta}`}
                {' — Bs '}
                {Number(
                  pagoParaAnular.monto
                ).toFixed(
                  2
                )}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                El pago dejará de formar parte del total pagado y el saldo pendiente de la venta o pedido será recalculado automáticamente.
              </div>

              <div>
                <label
                  htmlFor="motivo_anulacion_pago"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Motivo de anulación
                </label>

                <textarea
                  id="motivo_anulacion_pago"
                  value={
                    motivoAnulacion
                  }
                  onChange={(event) =>
                    setMotivoAnulacion(
                      event.target.value
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Explique el motivo de la anulación..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Mínimo 5 caracteres.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={
                    cerrarModalAnular
                  }
                  disabled={anulando}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    confirmarAnulacion
                  }
                  disabled={
                    anulando ||
                    motivoAnulacion
                      .trim()
                      .length < 5
                  }
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {anulando
                    ? 'Anulando...'
                    : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PagosPage

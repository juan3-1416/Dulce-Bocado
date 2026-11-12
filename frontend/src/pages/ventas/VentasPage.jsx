import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  anularVenta,
  listarVentas,
  obtenerVenta,
} from '../../services/ventaService'
import { listarClientes } from '../../services/clienteService'
import { listarPresentacionesVendibles } from '../../services/catalogoVentasService'
import { useAuth } from '../../context/AuthContext'
import VentaModal from './VentaModal'

function VentasPage() {
  const { tienePermiso } = useAuth()
  const [presentaciones, setPresentaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [catalogoDisponible, setCatalogoDisponible] = useState(false)
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false)
  const [ventaParaEditar, setVentaParaEditar] = useState(null)
  const [ventas, setVentas] =
    useState([])

  const [estado, setEstado] =
    useState('')

  const [pagina, setPagina] =
    useState(1)

  const [paginacion, setPaginacion] =
    useState(null)

  const [
    ventaSeleccionada,
    setVentaSeleccionada,
  ] = useState(null)

  const [
    ventaParaAnular,
    setVentaParaAnular,
  ] = useState(null)

  const [
    motivoAnulacion,
    setMotivoAnulacion,
  ] = useState('')

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] = useState(false)

  const [anulando, setAnulando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarVentas =
    useCallback(async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta =
          await listarVentas({
            estado,
            page: pagina,
            per_page: 15,
          })

        setVentas(
          respuesta.data ?? [],
        )

        setPaginacion({
          currentPage:
            respuesta.current_page ?? 1,
          lastPage:
            respuesta.last_page ?? 1,
          total:
            respuesta.total ?? 0,
        })
      } catch (errorPeticion) {
        if (
          errorPeticion.status === 401
        ) {
          setError(
            'Tu sesión no es válida o ha expirado.',
          )
        } else if (
          errorPeticion.status === 403
        ) {
          setError(
            'No tienes permiso para consultar ventas.',
          )
        } else {
          setError(
            errorPeticion.message ||
              'No se pudieron cargar las ventas.',
          )
        }

        setVentas([])
      } finally {
        setCargando(false)
      }
    }, [estado, pagina])

  useEffect(() => {
    cargarVentas()
  }, [cargarVentas])

  useEffect(() => {
    setPagina(1)
  }, [estado])

  useEffect(() => {
    let activo = true
    listarPresentacionesVendibles()
      .then((opciones) => {
        if (activo) {
          setPresentaciones(opciones)
          setCatalogoDisponible(opciones.length > 0)
        }
      })
      .catch(() => {
        if (activo) setCatalogoDisponible(false)
      })
    return () => { activo = false }
  }, [])

  const abrirFormulario = async (venta = null) => {
    if (!catalogoDisponible) return
    try {
      setError('')
      const respuestaClientes = await listarClientes({ estado: '1' })
      setClientes(respuestaClientes.clientes ?? [])
      if (venta) {
        const respuesta = await obtenerVenta(venta.id_venta)
        setVentaParaEditar(respuesta.venta ?? respuesta)
      } else {
        setVentaParaEditar(null)
      }
      setModalVentaAbierto(true)
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudieron cargar los datos de la venta.')
    }
  }

  const abrirDetalle = async (
    venta,
  ) => {
    try {
      setCargandoDetalle(true)
      setError('')

      const respuesta =
        await obtenerVenta(
          venta.id_venta,
        )

      setVentaSeleccionada(
        respuesta.venta ??
          respuesta,
      )
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudo consultar la venta.',
      )
    } finally {
      setCargandoDetalle(false)
    }
  }

  const abrirModalAnular = (
    venta,
  ) => {
    setError('')
    setMensaje('')
    setVentaParaAnular(venta)
    setMotivoAnulacion('')
  }

  const cerrarModalAnular = () => {
    if (anulando) {
      return
    }

    setVentaParaAnular(null)
    setMotivoAnulacion('')
  }

  const confirmarAnulacion =
    async () => {
      const motivo =
        motivoAnulacion.trim()

      if (motivo.length < 5) {
        setError(
          'El motivo de anulación debe tener al menos 5 caracteres.',
        )

        return
      }

      try {
        setAnulando(true)
        setError('')

        await anularVenta(
          ventaParaAnular.id_venta,
          motivo,
        )

        setMensaje(
          'Venta anulada correctamente.',
        )

        setVentaParaAnular(null)
        setMotivoAnulacion('')

        await cargarVentas()
      } catch (errorPeticion) {
        setError(
          errorPeticion.message ||
            'No se pudo anular la venta.',
        )
      } finally {
        setAnulando(false)
      }
    }

  const obtenerCliente = (
    venta,
  ) => {
    if (
      venta.nombre_cliente_ocasional
    ) {
      return (
        venta.nombre_cliente_ocasional
      )
    }

    if (venta.id_cliente) {
      return `Cliente #${venta.id_cliente}`
    }

    return 'Cliente ocasional'
  }

  const formatearFecha = (
    fecha,
  ) => {
    if (!fecha) {
      return '—'
    }

    return new Date(
      fecha,
    ).toLocaleString('es-BO')
  }

  const obtenerClaseEstado = (
    estadoVenta,
  ) => {
    if (
      estadoVenta === 'BORRADOR'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    if (
      estadoVenta === 'ANULADA' ||
      estadoVenta === 'CANCELADA'
    ) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-gray-100 text-gray-700'
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Ventas
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Ventas administradas por
            Sales Service.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirFormulario()}
          disabled={!catalogoDisponible || !tienePermiso('ventas.crear')}
          title={!catalogoDisponible ? 'Disponible cuando Catálogo publique presentaciones compatibles.' : undefined}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nueva Venta
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {catalogoDisponible
          ? 'El registro y edición usan Customer y Catálogo a través del Gateway. El total definitivo lo calcula Sales.'
          : 'El registro y edición de ventas requieren presentaciones del nuevo Catálogo. El listado, consulta y anulación utilizan Sales Service.'}
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="estado_venta"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Estado
        </label>

        <select
          id="estado_venta"
          value={estado}
          onChange={(event) =>
            setEstado(
              event.target.value,
            )
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 md:max-w-sm"
        >
          <option value="">
            Todas
          </option>

          <option value="BORRADOR">
            Borrador
          </option>

          <option value="ANULADA">
            Anulada
          </option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando ventas...
          </div>
        ) : ventas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No existen ventas
            registradas.
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
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Total
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
                {ventas.map(
                  (venta) => (
                    <tr
                      key={
                        venta.id_venta
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        #
                        {
                          venta.id_venta
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {obtenerCliente(
                          venta,
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-gray-900">
                        Bs{' '}
                        {Number(
                          venta.total ??
                            0,
                        ).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatearFecha(
                          venta.fecha_venta ??
                            venta.created_at,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(
                            venta.estado,
                          )}`}
                        >
                          {
                            venta.estado
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirDetalle(
                                venta,
                              )
                            }
                            disabled={
                              cargandoDetalle
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Ver
                          </button>

                          {venta.estado ===
                            'BORRADOR' && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirFormulario(venta)}
                                disabled={!catalogoDisponible || !tienePermiso('ventas.modificar')}
                                title={!catalogoDisponible ? 'Pendiente de Catálogo.' : undefined}
                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Editar
                              </button>

                              {tienePermiso('ventas.anular') && <button
                                type="button"
                                onClick={() =>
                                  abrirModalAnular(
                                    venta,
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                Anular
                              </button>}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paginacion && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total:{' '}
            {paginacion.total}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                paginacion.currentPage <=
                1
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    Math.max(
                      1,
                      actual - 1,
                    ),
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-40"
            >
              Anterior
            </button>

            <span>
              Página{' '}
              {
                paginacion.currentPage
              }{' '}
              de{' '}
              {paginacion.lastPage}
            </span>

            <button
              type="button"
              disabled={
                paginacion.currentPage >=
                paginacion.lastPage
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    actual + 1,
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <VentaModal
        abierto={modalVentaAbierto}
        onCerrar={() => setModalVentaAbierto(false)}
        onGuardado={async (mensajeGuardado) => {
          setMensaje(mensajeGuardado)
          await cargarVentas()
        }}
        clientes={clientes}
        presentaciones={presentaciones}
        venta={ventaParaEditar}
      />

      {ventaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Venta #
                  {
                    ventaSeleccionada.id_venta
                  }
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    ventaSeleccionada.estado
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setVentaSeleccionada(
                    null,
                  )
                }
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Cliente
                  </p>

                  <p className="mt-1 text-sm text-gray-900">
                    {obtenerCliente(
                      ventaSeleccionada,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Total
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-900">
                    Bs{' '}
                    {Number(
                      ventaSeleccionada.total ??
                        0,
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Detalles
                </p>

                {ventaSeleccionada
                  .detalles?.length ? (
                  <div className="space-y-3">
                    {ventaSeleccionada.detalles.map(
                      (
                        detalle,
                      ) => (
                        <div
                          key={
                            detalle.id_detalle_venta
                          }
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <p className="font-semibold text-gray-900">
                            {detalle.nombre_presentacion_snapshot ||
                              `Presentación #${detalle.presentacion_id}`}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            Cantidad:{' '}
                            {
                              detalle.cantidad
                            }
                          </p>

                          <p className="text-sm text-gray-600">
                            Precio
                            unitario: Bs{' '}
                            {Number(
                              detalle.precio_unitario_snapshot ??
                                0,
                            ).toFixed(
                              2,
                            )}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            Subtotal: Bs{' '}
                            {Number(
                              detalle.subtotal ??
                                0,
                            ).toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Sin detalles.
                  </p>
                )}
              </div>

              {ventaSeleccionada.observaciones && (
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Observaciones
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {
                      ventaSeleccionada.observaciones
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {ventaParaAnular && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                Anular Venta
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Venta #
                {
                  ventaParaAnular.id_venta
                }
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Solo los borradores
                pueden anularse en
                Sprint 2.
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Motivo de
                  anulación
                </label>

                <textarea
                  value={
                    motivoAnulacion
                  }
                  onChange={(event) =>
                    setMotivoAnulacion(
                      event.target
                        .value,
                    )
                  }
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={
                    cerrarModalAnular
                  }
                  disabled={
                    anulando
                  }
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
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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

export default VentasPage

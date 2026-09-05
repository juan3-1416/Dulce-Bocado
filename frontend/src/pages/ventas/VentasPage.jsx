import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import VentaModal from './VentaModal'

import {
  anularVenta,
  listarVentas,
  obtenerCatalogosVenta,
} from '../../services/ventaService'

function VentasPage() {
  const [ventas, setVentas] =
    useState([])

  const [buscar, setBuscar] =
    useState('')

  const [estado, setEstado] =
    useState('')

  const [clientes, setClientes] =
    useState([])

  const [
    productosPresentaciones,
    setProductosPresentaciones,
  ] = useState([])

  const [modalAbierto, setModalAbierto] =
    useState(false)

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
    cargandoCatalogos,
    setCargandoCatalogos,
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
            buscar,
            estado,
          })

        setVentas(
          respuesta.ventas ?? []
        )
      } catch (errorPeticion) {
        if (
          errorPeticion.status === 403
        ) {
          setError(
            'No tienes permiso para gestionar ventas.'
          )
        } else if (
          errorPeticion.status === 401
        ) {
          setError(
            'Tu sesión ha expirado.'
          )
        } else {
          setError(
            errorPeticion.message ||
              'No se pudieron cargar las ventas.'
          )
        }
      } finally {
        setCargando(false)
      }
    }, [buscar, estado])

  const cargarCatalogos =
    useCallback(async () => {
      const respuesta =
        await obtenerCatalogosVenta()

      setClientes(
        respuesta.clientes ?? []
      )

      setProductosPresentaciones(
        respuesta.productos_presentaciones ??
          []
      )
    }, [])

  useEffect(() => {
    const temporizador =
      setTimeout(() => {
        cargarVentas()
      }, 300)

    return () =>
      clearTimeout(temporizador)
  }, [cargarVentas])

  const abrirNuevaVenta = async () => {
    try {
      setCargandoCatalogos(true)
      setError('')
      setMensaje('')
      setVentaSeleccionada(null)

      await cargarCatalogos()

      setModalAbierto(true)
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudieron cargar los datos para registrar la venta.'
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const abrirEditarVenta = async (
    venta
  ) => {
    if (
      venta.estado ===
      'ANULADA'
    ) {
      setError(
        'No se puede editar una venta anulada.'
      )
      return
    }

    try {
      setCargandoCatalogos(true)
      setError('')
      setMensaje('')

      await cargarCatalogos()

      setVentaSeleccionada(
        venta
      )

      setModalAbierto(true)
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudieron cargar los datos para editar la venta.'
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setVentaSeleccionada(null)
  }

  const manejarGuardado = async (
    mensajeRespuesta
  ) => {
    setMensaje(
      mensajeRespuesta
    )

    await cargarVentas()
  }

  const abrirModalAnular = (
    venta
  ) => {
    setError('')
    setMensaje('')

    setVentaParaAnular(
      venta
    )

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
          'El motivo de anulación debe tener al menos 5 caracteres.'
        )
        return
      }

      try {
        setAnulando(true)
        setError('')

        await anularVenta(
          ventaParaAnular.id_venta,
          motivo
        )

        setMensaje(
          'Venta anulada correctamente.'
        )

        setVentaParaAnular(null)
        setMotivoAnulacion('')

        await cargarVentas()
      } catch (errorPeticion) {
        setError(
          errorPeticion.message ||
            'No se pudo anular la venta.'
        )
      } finally {
        setAnulando(false)
      }
    }

  const obtenerNombreCliente = (
    venta
  ) => {
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

  return (
    <section className="space-y-6">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Ventas
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Registra y administra las ventas realizadas en Dulce Bocado.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevaVenta}
          disabled={
            cargandoCatalogos
          }
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoCatalogos
            ? 'Cargando...'
            : 'Nueva Venta'}
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
            htmlFor="buscar_venta"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Buscar
          </label>

          <input
            id="buscar_venta"
            type="text"
            value={buscar}
            onChange={(event) =>
              setBuscar(
                event.target.value
              )
            }
            placeholder="Cliente o producto..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>

        <div>
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
                event.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">
              Todas
            </option>

            <option value="REGISTRADA">
              Registradas
            </option>

            <option value="ANULADA">
              Anuladas
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando ventas...
          </div>
        ) : ventas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No existen ventas registradas.
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
                    Productos
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
                      className="align-top hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        #{venta.id_venta}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {obtenerNombreCliente(
                            venta
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Registrada por:{' '}
                          {venta.usuario
                            ?.nombre ||
                            '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {venta.detalles?.map(
                            (
                              detalle
                            ) => (
                              <div
                                key={
                                  detalle.id_detalle_venta
                                }
                                className="text-sm text-gray-700"
                              >
                                <span className="font-medium">
                                  {
                                    detalle
                                      .producto_presentacion
                                      ?.producto
                                      ?.nombre
                                  }
                                </span>

                                {' — '}

                                {
                                  detalle
                                    .producto_presentacion
                                    ?.presentacion
                                    ?.nombre
                                }

                                {' × '}

                                {
                                  detalle.cantidad
                                }

                                <div className="text-xs text-gray-500">
                                  Bs{' '}
                                  {Number(
                                    detalle.subtotal
                                  ).toFixed(
                                    2
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-gray-900">
                        Bs{' '}
                        {Number(
                          venta.total
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatearFecha(
                          venta.fecha_venta
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {venta.estado ===
                        'REGISTRADA' ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Registrada
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Anulada
                            </span>

                            {venta.motivo_anulacion && (
                              <p className="mt-2 max-w-xs text-xs text-gray-500">
                                {
                                  venta.motivo_anulacion
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {venta.estado ===
                        'REGISTRADA' ? (
                          <div className="flex flex-wrap gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                abrirEditarVenta(
                                  venta
                                )
                              }
                              className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                abrirModalAnular(
                                  venta
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Anular
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin acciones
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

      <VentaModal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        onGuardado={manejarGuardado}
        clientes={clientes}
        productosPresentaciones={
          productosPresentaciones
        }
        venta={
          ventaSeleccionada
        }
      />

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
                {' — Bs '}
                {Number(
                  ventaParaAnular.total
                ).toFixed(2)}
              </p>
            </div>

            <div className="space-y-5 p-6">

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Una venta anulada no podrá volver a activarse ni editarse.
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Motivo de anulación
                </label>

                <textarea
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

export default VentasPage
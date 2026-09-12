import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

import {
  actualizarEstado,
  listarProducciones,
  obtenerProduccion,
} from '../../services/produccionService'

import CompletarProduccionModal from './CompletarProduccionModal'
import RegistrarConsumoProduccionModal from './RegistrarConsumoProduccionModal'

const ESTADO_COLORS = {
  PROGRAMADA:
    'bg-blue-100 text-blue-700',

  EN_PROCESO:
    'bg-yellow-100 text-yellow-700',

  COMPLETADA:
    'bg-green-100 text-green-700',

  CANCELADA:
    'bg-red-100 text-red-700',

  default:
    'bg-gray-100 text-gray-700',
}

const ESTADO_TEXTO = {
  PROGRAMADA: 'Programada',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

function formatearFecha(valor) {
  if (!valor) return '—'

  const fecha =
    String(valor).split('T')[0]

  if (
    !fecha ||
    fecha === 'null'
  ) {
    return '—'
  }

  const [anio, mes, dia] =
    fecha.split('-')

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return fecha
  }

  return `${dia}/${mes}/${anio}`
}

function formatearNumero(
  valor,
  decimales = 2
) {
  const numero =
    Number.parseFloat(valor)

  if (!Number.isFinite(numero)) {
    return '0'
  }

  return numero.toFixed(decimales)
}

function leerRelacion(
  referencia,
  clave
) {
  if (!referencia) {
    return null
  }

  const claveCamel =
    clave.replace(
      /_([a-z])/g,
      (_, letra) =>
        letra.toUpperCase()
    )

  return (
    referencia[clave] ??
    referencia[claveCamel]
  )
}

function ProduccionList() {
  const navigate = useNavigate()

  const {
    tienePermiso,
  } = useAuth()

  const puedeCrear =
    tienePermiso(
      'produccion.crear'
    )

  const puedeGestionar =
    tienePermiso(
      'produccion.gestionar'
    )

  const puedeRegistrarConsumo =
    tienePermiso(
      'produccion.registrar_consumo'
    )

  const [
    producciones,
    setProducciones,
  ] = useState([])

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    mensaje,
    setMensaje,
  ] = useState('')

  const [
    detalleProduccion,
    setDetalleProduccion,
  ] = useState(null)

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] = useState(false)

  /*
   * Modal existente:
   * ahora se utiliza únicamente
   * para cancelar.
   */
  const [
    modalCancelar,
    setModalCancelar,
  ] = useState(null)

  /*
   * Modal nuevo de CU17.
   */
  const [
    modalConsumo,
    setModalConsumo,
  ] = useState(null)

  const [
    filtros,
    setFiltros,
  ] = useState({
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
  })

  const cargarProducciones =
    useCallback(
      async () => {
        try {
          setCargando(true)
          setError('')

          const respuesta =
            await listarProducciones(
              filtros
            )

          const lista =
            Array.isArray(
              respuesta
            )
              ? respuesta
              : respuesta
                  ?.producciones ??
                respuesta
                  ?.data ??
                []

          setProducciones(
            lista
          )
        } catch (err) {
          setProducciones([])

          setError(
            err.message ||
              'No se pudieron cargar las órdenes de producción.'
          )
        } finally {
          setCargando(false)
        }
      },
      [filtros]
    )

  useEffect(() => {
    cargarProducciones()
  }, [cargarProducciones])

  const manejarCambioFiltro = (
    evento
  ) => {
    const {
      name,
      value,
    } = evento.target

    setFiltros(
      (prev) => ({
        ...prev,
        [name]: value,
      })
    )
  }

  const limpiarFiltros = () => {
    setFiltros({
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
    })
  }

  const obtenerNombreProducto = (
    produccion
  ) => {
    const productoPresentacion =
      leerRelacion(
        produccion,
        'producto_presentacion'
      ) ?? {}

    const producto =
      leerRelacion(
        productoPresentacion,
        'producto'
      ) ?? {}

    const presentacion =
      leerRelacion(
        productoPresentacion,
        'presentacion'
      ) ?? {}

    const nombreProducto =
      producto.nombre ||
      'Producto sin nombre'

    const nombrePresentacion =
      presentacion.nombre ||
      'Presentación'

    return (
      `${nombreProducto} / ` +
      `${nombrePresentacion}`
    )
  }

  const obtenerCantidadEsperada = (
    produccion
  ) => {
    const detalle =
      Array.isArray(
        produccion.detalles
      )
        ? produccion.detalles[0]
        : null

    return (
      detalle?.cantidad_esperada ??
      detalle?.cantidadEsperada ??
      0
    )
  }

  const obtenerCantidadProducida = (
    produccion
  ) => {
    const detalle =
      Array.isArray(
        produccion.detalles
      )
        ? produccion.detalles[0]
        : null

    return (
      detalle?.cantidad_producida ??
      detalle?.cantidadProducida ??
      0
    )
  }

  const obtenerClaseEstado = (
    estado
  ) =>
    ESTADO_COLORS[estado] ??
    ESTADO_COLORS.default

  const obtenerTextoEstado = (
    estado
  ) =>
    ESTADO_TEXTO[estado] ??
    estado ??
    'Sin estado'

  const abrirDetalle =
    async (
      produccion
    ) => {
      try {
        setCargandoDetalle(true)
        setError('')
        setMensaje('')

        const respuesta =
          await obtenerProduccion(
            produccion
              .id_produccion
          )

        const detalle =
          respuesta
            ?.produccion ??
          respuesta

        setDetalleProduccion(
          detalle
        )
      } catch (err) {
        setError(
          err.message ||
            'No se pudo cargar el detalle de la producción.'
        )
      } finally {
        setCargandoDetalle(
          false
        )
      }
    }

  const iniciarProduccion =
    async (
      produccion
    ) => {
      try {
        setError('')
        setMensaje('')

        await actualizarEstado(
          produccion
            .id_produccion,
          {
            estado:
              'EN_PROCESO',
          }
        )

        setMensaje(
          'La producción fue iniciada correctamente.'
        )

        await cargarProducciones()

        setDetalleProduccion(
          null
        )
      } catch (err) {
        setError(
          err.message ||
            'No se pudo iniciar la producción.'
        )
      }
    }

  const abrirModalCancelar = (
    produccion
  ) => {
    setError('')
    setMensaje('')
    setModalCancelar(
      produccion
    )
  }

  const abrirModalConsumo = (
    produccion
  ) => {
    setError('')
    setMensaje('')
    setModalConsumo(
      produccion
    )
  }

  const confirmarCancelacion =
    async (
      idProduccion,
      datos = {}
    ) => {
      await actualizarEstado(
        idProduccion,
        {
          ...datos,
          estado:
            'CANCELADA',
        }
      )

      setMensaje(
        'Orden de producción cancelada correctamente.'
      )

      await cargarProducciones()

      setDetalleProduccion(
        null
      )

      setModalCancelar(
        null
      )
    }

  const consumoRegistrado =
    async (
      respuesta
    ) => {
      setModalConsumo(null)

      setDetalleProduccion(
        null
      )

      setMensaje(
        respuesta?.message ||
          'Consumo, costo y desperdicio registrados correctamente.'
      )

      await cargarProducciones()
    }

  const resumen =
    useMemo(
      () => ({
        total:
          producciones.length,

        programadas:
          producciones.filter(
            (item) =>
              item.estado ===
              'PROGRAMADA'
          ).length,

        enProceso:
          producciones.filter(
            (item) =>
              item.estado ===
              'EN_PROCESO'
          ).length,

        completadas:
          producciones.filter(
            (item) =>
              item.estado ===
              'COMPLETADA'
          ).length,
      }),
      [producciones]
    )

  const consumosDetalle =
    detalleProduccion
      ?.consumos ?? []

  const costoTotalDetalle =
    consumosDetalle.reduce(
      (total, consumo) =>
        total +
        Number(
          consumo.costo_total ??
            0
        ),
      0
    )

  const desperdicioTotalDetalle =
    consumosDetalle.reduce(
      (total, consumo) =>
        total +
        Number(
          consumo
            .cantidad_desperdicio ??
            0
        ),
      0
    )

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Producción
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gestiona las órdenes de
            producción, sus consumos,
            costos y desperdicios.
          </p>
        </div>

        {puedeCrear && (
          <button
            type="button"
            onClick={() =>
              navigate(
                '/produccion/crear'
              )
            }
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
          >
            Nueva Producción
          </button>
        )}
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Estado
            </label>

            <select
              name="estado"
              value={
                filtros.estado
              }
              onChange={
                manejarCambioFiltro
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="">
                Todos
              </option>

              <option value="PROGRAMADA">
                PROGRAMADA
              </option>

              <option value="EN_PROCESO">
                EN_PROCESO
              </option>

              <option value="COMPLETADA">
                COMPLETADA
              </option>

              <option value="CANCELADA">
                CANCELADA
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Fecha desde
            </label>

            <input
              type="date"
              name="fecha_desde"
              value={
                filtros
                  .fecha_desde
              }
              onChange={
                manejarCambioFiltro
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Fecha hasta
            </label>

            <input
              type="date"
              name="fecha_hasta"
              value={
                filtros
                  .fecha_hasta
              }
              onChange={
                manejarCambioFiltro
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={
              limpiarFiltros
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Resultados
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.total}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase text-blue-700">
            Programadas
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-800">
            {
              resumen
                .programadas
            }
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-semibold uppercase text-yellow-700">
            En proceso
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-800">
            {
              resumen
                .enProceso
            }
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">
            Completadas
          </p>

          <p className="mt-1 text-2xl font-bold text-green-800">
            {
              resumen
                .completadas
            }
          </p>
        </div>
      </div>

      {detalleProduccion && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detalle
              </p>

              <h2 className="text-lg font-bold text-slate-900">
                {
                  obtenerNombreProducto(
                    detalleProduccion
                  )
                }
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setDetalleProduccion(
                  null
                )
              }
              className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase text-slate-500">
                Orden
              </p>

              <p className="font-semibold text-slate-800">
                #
                {
                  detalleProduccion
                    .id_produccion
                }
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Cantidad esperada
              </p>

              <p className="font-semibold text-slate-800">
                {formatearNumero(
                  obtenerCantidadEsperada(
                    detalleProduccion
                  )
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Unidades buenas
              </p>

              <p className="font-semibold text-slate-800">
                {formatearNumero(
                  obtenerCantidadProducida(
                    detalleProduccion
                  )
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Costo producción
              </p>

              <p className="font-semibold text-slate-800">
                Bs{' '}
                {formatearNumero(
                  costoTotalDetalle,
                  4
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Desperdicio
              </p>

              <p className="font-semibold text-slate-800">
                {formatearNumero(
                  desperdicioTotalDetalle,
                  3
                )}
              </p>
            </div>
          </div>

          {consumosDetalle.length >
            0 && (
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                      Materia prima
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                      Teórico
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                      Consumido
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                      Desperdicio
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                      Costo
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {consumosDetalle.map(
                    (
                      consumo
                    ) => (
                      <tr
                        key={
                          consumo
                            .id_consumo_produccion
                        }
                      >
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {
                            consumo
                              .materia_prima
                              ?.nombre ??
                            'Materia prima'
                          }
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatearNumero(
                            consumo
                              .cantidad_teorica,
                            3
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatearNumero(
                            consumo
                              .cantidad_consumida,
                            3
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatearNumero(
                            consumo
                              .cantidad_desperdicio,
                            3
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                          Bs{' '}
                          {formatearNumero(
                            consumo
                              .costo_total,
                            4
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
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando órdenes...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Producto / Presentación
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Cantidad esperada
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Unidades buenas
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Responsable
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {producciones.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  producciones.map(
                    (
                      produccion
                    ) => (
                      <tr
                        key={
                          produccion
                            .id_produccion
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            #
                            {
                              produccion
                                .id_produccion
                            }
                          </p>

                          <p className="text-sm text-gray-700">
                            {
                              obtenerNombreProducto(
                                produccion
                              )
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-gray-700">
                          {formatearNumero(
                            obtenerCantidadEsperada(
                              produccion
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-gray-700">
                          {formatearNumero(
                            obtenerCantidadProducida(
                              produccion
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={
                              `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ` +
                              obtenerClaseEstado(
                                produccion
                                  .estado
                              )
                            }
                          >
                            {
                              obtenerTextoEstado(
                                produccion
                                  .estado
                              )
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {
                            formatearFecha(
                              produccion
                                .fecha_produccion
                            )
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {
                            produccion
                              .usuario
                              ?.nombre ||
                            'Sin responsable'
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                abrirDetalle(
                                  produccion
                                )
                              }
                              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Ver detalle
                            </button>

                            {puedeGestionar &&
                              produccion.estado ===
                                'PROGRAMADA' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    iniciarProduccion(
                                      produccion
                                    )
                                  }
                                  className="rounded border border-yellow-200 px-2 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
                                >
                                  Iniciar
                                </button>
                              )}

                            {puedeRegistrarConsumo &&
                              produccion.estado ===
                                'EN_PROCESO' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirModalConsumo(
                                      produccion
                                    )
                                  }
                                  className="rounded border border-green-200 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                                >
                                  Registrar consumo
                                </button>
                              )}

                            {puedeGestionar &&
                              (
                                produccion.estado ===
                                  'PROGRAMADA' ||
                                produccion.estado ===
                                  'EN_PROCESO'
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirModalCancelar(
                                      produccion
                                    )
                                  }
                                  className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  Cancelar
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cargandoDetalle && (
        <div className="text-sm text-gray-500">
          Cargando detalle...
        </div>
      )}

      {/*
        El modal antiguo se conserva únicamente
        para la cancelación de CU16.
      */}
      <CompletarProduccionModal
        isOpen={
          Boolean(
            modalCancelar
          )
        }
        produccion={
          modalCancelar
        }
        modo="cancelar"
        onClose={() =>
          setModalCancelar(
            null
          )
        }
        onConfirm={
          confirmarCancelacion
        }
        onCancel={
          confirmarCancelacion
        }
      />

      {/*
        Nuevo modal correspondiente a CU17.
      */}
      <RegistrarConsumoProduccionModal
        isOpen={
          Boolean(
            modalConsumo
          )
        }
        produccion={
          modalConsumo
        }
        onClose={() =>
          setModalConsumo(null)
        }
        onSuccess={
          consumoRegistrado
        }
      />
    </section>
  )
}

export default ProduccionList
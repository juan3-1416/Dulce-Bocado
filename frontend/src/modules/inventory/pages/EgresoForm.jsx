import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { crearEgreso } from '../../services/egresoService'

import {
  listarAlmacenes,
  listarExistenciasPorAlmacen,
} from '../../services/inventarioService'

export default function EgresoForm() {
  const navigate = useNavigate()

  const [almacenes, setAlmacenes] = useState([])
  const [existenciasPorAlmacen, setExistenciasPorAlmacen] =
    useState({})

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const [glosa, setGlosa] = useState('')

  const [detalles, setDetalles] = useState([
    {
      tipo: 'materia_prima',
      id_almacen: '',
      id_item: '',
      cantidad: 1,
    },
  ])

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true)
      setError(null)

      const almacenesRes =
        await listarAlmacenes()

      setAlmacenes(
        Array.isArray(almacenesRes)
          ? almacenesRes
          : []
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar los almacenes.'
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const cargarExistenciasAlmacen = async (
    idAlmacen
  ) => {
    if (!idAlmacen) {
      return
    }

    try {
      setError(null)

      const data =
        await listarExistenciasPorAlmacen(
          idAlmacen
        )

      setExistenciasPorAlmacen(
        (prev) => ({
          ...prev,
          [idAlmacen]: Array.isArray(data)
            ? data
            : [],
        })
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar las existencias del almacén.'
      )
    }
  }

  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      {
        tipo: 'materia_prima',
        id_almacen: '',
        id_item: '',
        cantidad: 1,
      },
    ])
  }

  const eliminarDetalle = (index) => {
    if (detalles.length === 1) {
      return
    }

    const nuevosDetalles = [
      ...detalles,
    ]

    nuevosDetalles.splice(
      index,
      1
    )

    setDetalles(nuevosDetalles)
  }

  const actualizarDetalle = (
    index,
    campo,
    valor
  ) => {
    const nuevosDetalles = [
      ...detalles,
    ]

    nuevosDetalles[index] = {
      ...nuevosDetalles[index],
      [campo]: valor,
    }

    if (
      campo === 'tipo' ||
      campo === 'id_almacen'
    ) {
      nuevosDetalles[index].id_item =
        ''
    }

    if (campo === 'tipo') {
      nuevosDetalles[index].cantidad =
        1
    }

    setDetalles(nuevosDetalles)

    if (
      campo === 'id_almacen' &&
      valor
    ) {
      cargarExistenciasAlmacen(
        valor
      )
    }
  }

  const obtenerItemsDisponibles = (
    detalle
  ) => {
    if (!detalle.id_almacen) {
      return []
    }

    const existencias =
      existenciasPorAlmacen[
        detalle.id_almacen
      ] || []

    return existencias.filter(
      (existencia) => {
        if (
          Number(
            existencia.cantidad
          ) <= 0
        ) {
          return false
        }

        if (
          detalle.tipo ===
          'materia_prima'
        ) {
          return Boolean(
            existencia.materia_prima
          )
        }

        return Boolean(
          existencia.producto_presentacion
        )
      }
    )
  }

  const obtenerExistenciaSeleccionada = (
    detalle
  ) => {
    if (
      !detalle.id_almacen ||
      !detalle.id_item
    ) {
      return null
    }

    const existencias =
      obtenerItemsDisponibles(
        detalle
      )

    return (
      existencias.find(
        (existencia) => {
          if (
            detalle.tipo ===
            'materia_prima'
          ) {
            return (
              Number(
                existencia.id_materia_prima
              ) ===
              Number(
                detalle.id_item
              )
            )
          }

          return (
            Number(
              existencia.id_producto_presentacion
            ) ===
            Number(
              detalle.id_item
            )
          )
        }
      ) || null
    )
  }

  const manejarSubmit = async (
    e
  ) => {
    e.preventDefault()
    setError(null)

    if (!glosa.trim()) {
      setError(
        'La glosa o motivo del egreso es obligatoria.'
      )
      return
    }

    const payloadDetalles = []

    for (
      let i = 0;
      i < detalles.length;
      i++
    ) {
      const d = detalles[i]

      if (!d.id_almacen) {
        setError(
          `Seleccione un almacén de origen para el ítem #${i + 1}`
        )
        return
      }

      if (!d.id_item) {
        setError(
          `Seleccione un producto o materia prima para el ítem #${i + 1}`
        )
        return
      }

      const cantidad =
        Number(d.cantidad)

      if (
        !Number.isFinite(
          cantidad
        ) ||
        cantidad <= 0
      ) {
        setError(
          `La cantidad debe ser mayor a 0 en el ítem #${i + 1}`
        )
        return
      }

      if (
        d.tipo === 'producto' &&
        !Number.isInteger(
          cantidad
        )
      ) {
        setError(
          `La cantidad de productos debe ser un número entero en el ítem #${i + 1}`
        )
        return
      }

      const existencia =
        obtenerExistenciaSeleccionada(
          d
        )

      if (!existencia) {
        setError(
          `No se encontró la existencia seleccionada para el ítem #${i + 1}`
        )
        return
      }

      const stockDisponible =
        Number(
          existencia.cantidad
        )

      if (
        cantidad >
        stockDisponible
      ) {
        setError(
          `Stock insuficiente en el ítem #${i + 1}. Disponible: ${stockDisponible}. Solicitado: ${cantidad}.`
        )
        return
      }

      payloadDetalles.push({
        id_almacen:
          Number(
            d.id_almacen
          ),

        cantidad,

        id_materia_prima:
          d.tipo ===
          'materia_prima'
            ? Number(
                d.id_item
              )
            : null,

        id_producto_presentacion:
          d.tipo ===
          'producto'
            ? Number(
                d.id_item
              )
            : null,
      })
    }

    try {
      setGuardando(true)

      await crearEgreso({
        glosa:
          glosa.trim(),

        detalles:
          payloadDetalles,
      })

      navigate(
        '/inventario/egresos'
      )
    } catch (err) {
      const errores =
        err?.data?.errors

      if (errores) {
        const primerError =
          Object.values(
            errores
          )[0]

        if (
          Array.isArray(
            primerError
          ) &&
          primerError.length >
            0
        ) {
          setError(
            primerError[0]
          )
          return
        }
      }

      setError(
        err.message ||
          'Error al registrar el egreso de inventario.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Registrar Egreso de
            Inventario
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Registra mermas,
            vencimientos, daños o
            salidas directas de
            materias primas o
            productos.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {cargandoCatalogos ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-pink-600" />
        </div>
      ) : (
        <form
          onSubmit={
            manejarSubmit
          }
          className="space-y-8 divide-y divide-gray-200"
        >
          {/* Datos generales */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Datos del Registro
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Información general
                y motivo del egreso.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label
                  htmlFor="glosa"
                  className="block text-sm font-medium text-gray-700"
                >
                  Glosa / Motivo de
                  Salida *
                </label>

                <div className="mt-1">
                  <input
                    type="text"
                    name="glosa"
                    id="glosa"
                    required
                    value={glosa}
                    onChange={(e) =>
                      setGlosa(
                        e.target.value
                      )
                    }
                    className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                    placeholder="Ej. Merma por vencimiento, producto dañado o rotura de envase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="rounded-lg bg-white p-6 pt-6 shadow">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Detalles del Egreso
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Selecciona primero
                el almacén de
                origen. El sistema
                mostrará únicamente
                los artículos que
                tienen existencia en
                ese almacén.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {detalles.map(
                (
                  detalle,
                  index
                ) => {
                  const itemsDisponibles =
                    obtenerItemsDisponibles(
                      detalle
                    )

                  const existenciaSeleccionada =
                    obtenerExistenciaSeleccionada(
                      detalle
                    )

                  return (
                    <div
                      key={
                        index
                      }
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
                        {/* Almacén */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Almacén
                            Origen *
                          </label>

                          <select
                            value={
                              detalle.id_almacen
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarDetalle(
                                index,
                                'id_almacen',
                                e
                                  .target
                                  .value
                              )
                            }
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm"
                          >
                            <option value="">
                              Seleccionar...
                            </option>

                            {almacenes.map(
                              (
                                almacen
                              ) => (
                                <option
                                  key={
                                    almacen.id_almacen
                                  }
                                  value={
                                    almacen.id_almacen
                                  }
                                >
                                  {
                                    almacen.nombre
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {/* Tipo */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Tipo de
                            Ítem
                          </label>

                          <select
                            value={
                              detalle.tipo
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarDetalle(
                                index,
                                'tipo',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm"
                          >
                            <option value="materia_prima">
                              Materia
                              Prima
                            </option>

                            <option value="producto">
                              Producto /
                              Presentación
                            </option>
                          </select>
                        </div>

                        {/* Ítem */}
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Ítem *
                          </label>

                          <select
                            value={
                              detalle.id_item
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarDetalle(
                                index,
                                'id_item',
                                e
                                  .target
                                  .value
                              )
                            }
                            required
                            disabled={
                              !detalle.id_almacen
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:text-sm"
                          >
                            <option value="">
                              {!detalle.id_almacen
                                ? 'Primero seleccione un almacén'
                                : itemsDisponibles.length ===
                                    0
                                  ? 'Sin existencias disponibles'
                                  : 'Seleccionar...'}
                            </option>

                            {itemsDisponibles.map(
                              (
                                existencia
                              ) => {
                                if (
                                  detalle.tipo ===
                                  'materia_prima'
                                ) {
                                  return (
                                    <option
                                      key={
                                        existencia.id_inventario
                                      }
                                      value={
                                        existencia.id_materia_prima
                                      }
                                    >
                                      {
                                        existencia
                                          .materia_prima
                                          ?.nombre
                                      }
                                      {' — Stock: '}
                                      {Number(
                                        existencia.cantidad
                                      ).toLocaleString(
                                        'es-BO',
                                        {
                                          maximumFractionDigits: 3,
                                        }
                                      )}{' '}
                                      {
                                        existencia
                                          .materia_prima
                                          ?.unidad_medida
                                      }
                                    </option>
                                  )
                                }

                                return (
                                  <option
                                    key={
                                      existencia.id_inventario
                                    }
                                    value={
                                      existencia.id_producto_presentacion
                                    }
                                  >
                                    {
                                      existencia
                                        .producto_presentacion
                                        ?.producto
                                        ?.nombre
                                    }
                                    {' - '}
                                    {
                                      existencia
                                        .producto_presentacion
                                        ?.presentacion
                                        ?.nombre
                                    }
                                    {' — Stock: '}
                                    {Number(
                                      existencia.cantidad
                                    ).toLocaleString(
                                      'es-BO',
                                      {
                                        maximumFractionDigits: 3,
                                      }
                                    )}
                                  </option>
                                )
                              }
                            )}
                          </select>
                        </div>

                        {/* Cantidad */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Cantidad *
                          </label>

                          <input
                            type="number"
                            min={
                              detalle.tipo ===
                              'producto'
                                ? '1'
                                : '0.001'
                            }
                            step={
                              detalle.tipo ===
                              'producto'
                                ? '1'
                                : '0.001'
                            }
                            max={
                              existenciaSeleccionada
                                ? Number(
                                    existenciaSeleccionada.cantidad
                                  )
                                : undefined
                            }
                            required
                            value={
                              detalle.cantidad
                            }
                            onChange={(
                              e
                            ) =>
                              actualizarDetalle(
                                index,
                                'cantidad',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                          />
                        </div>

                        {/* Eliminar */}
                        <div className="md:col-span-1">
                          <button
                            type="button"
                            onClick={() =>
                              eliminarDetalle(
                                index
                              )
                            }
                            disabled={
                              detalles.length ===
                              1
                            }
                            className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-red-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
                            title="Eliminar este ítem"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={
                                  2
                                }
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Stock seleccionado */}
                      {existenciaSeleccionada && (
                        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                          <p className="text-sm text-blue-700">
                            Stock
                            disponible:{' '}
                            <span className="font-semibold">
                              {Number(
                                existenciaSeleccionada.cantidad
                              ).toLocaleString(
                                'es-BO',
                                {
                                  maximumFractionDigits: 3,
                                }
                              )}{' '}
                              {detalle.tipo ===
                              'materia_prima'
                                ? existenciaSeleccionada
                                    .materia_prima
                                    ?.unidad_medida
                                : 'unidades'}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={
                  agregarDetalle
                }
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={
                      2
                    }
                    d="M12 4v16m8-8H4"
                  />
                </svg>

                Agregar otro ítem
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/inventario/egresos'
                )
              }
              disabled={
                guardando
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando
              }
              className="inline-flex justify-center rounded-md border border-transparent bg-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {guardando
                ? 'Guardando Egreso...'
                : 'Guardar Egreso'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
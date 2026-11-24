import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { crearIngreso } from '../../services/ingresoService'
import { listarAlmacenes } from '../../services/inventarioService'
import { listarMateriasPrimas } from '../../services/materiaPrimaService'
import { listarProductos } from '../../services/productoService'

function crearDetalleVacio() {
  return {
    tipo: 'materia_prima',
    id_almacen: '',
    id_item: '',
    cantidad: 1,
    costo_total: '',
  }
}

export default function IngresoForm() {
  const navigate = useNavigate()

  const [almacenes, setAlmacenes] = useState([])
  const [materiasPrimas, setMateriasPrimas] = useState([])
  const [
    presentacionesPlanificadas,
    setPresentacionesPlanificadas,
  ] = useState([])

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState(null)

  const [glosa, setGlosa] =
    useState('')

  const [detalles, setDetalles] =
    useState([
      crearDetalleVacio(),
    ])

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true)
      setError(null)

      const [
        almacenesRes,
        materiasRes,
        productosRes,
      ] = await Promise.all([
        listarAlmacenes(),
        listarMateriasPrimas({
          estado: '1',
        }),
        listarProductos({
          estado: '1',
        }),
      ])

      setAlmacenes(
        almacenesRes ?? []
      )

      setMateriasPrimas(
        materiasRes.materias_primas ?? []
      )

      /*
       * Aplanar las presentaciones
       * de todos los productos.
       */
      const presentaciones = []

      ;(
        productosRes.productos ?? []
      ).forEach((producto) => {
        if (
          Array.isArray(
            producto.presentaciones
          )
        ) {
          producto.presentaciones.forEach(
            (presentacion) => {
              presentaciones.push({
                id_producto_presentacion:
                  presentacion.pivot
                    ?.id_producto_presentacion ??
                  presentacion.id_presentacion,

                nombre_producto:
                  producto.nombre,

                nombre_presentacion:
                  presentacion.nombre,
              })
            }
          )
        }
      })

      setPresentacionesPlanificadas(
        presentaciones
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar catálogos.'
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const agregarDetalle = () => {
    setDetalles(
      (actuales) => [
        ...actuales,
        crearDetalleVacio(),
      ]
    )
  }

  const eliminarDetalle = (index) => {
    if (detalles.length === 1) {
      return
    }

    setDetalles(
      (actuales) =>
        actuales.filter(
          (_, indice) =>
            indice !== index
        )
    )
  }

  const actualizarDetalle = (
    index,
    campo,
    valor
  ) => {
    setDetalles(
      (actuales) =>
        actuales.map(
          (
            detalle,
            indice
          ) => {
            if (indice !== index) {
              return detalle
            }

            const actualizado = {
              ...detalle,
              [campo]: valor,
            }

            /*
             * Al cambiar el tipo de ítem,
             * limpiamos el artículo y precio.
             */
            if (campo === 'tipo') {
              actualizado.id_item = ''
              actualizado.costo_total = ''
            }

            return actualizado
          }
        )
    )
  }

  const obtenerUnidadMateriaPrima = (
    detalle
  ) => {
    if (
      detalle.tipo !==
        'materia_prima' ||
      !detalle.id_item
    ) {
      return ''
    }

    const materiaPrima =
      materiasPrimas.find(
        (materia) =>
          Number(
            materia.id_materia_prima
          ) ===
          Number(
            detalle.id_item
          )
      )

    return (
      materiaPrima?.unidad_medida ??
      ''
    )
  }

  const obtenerCostoUnitario = (
    detalle
  ) => {
    const cantidad =
      Number(
        detalle.cantidad
      )

    const costoTotal =
      Number(
        detalle.costo_total
      )

    if (
      !Number.isFinite(cantidad) ||
      !Number.isFinite(costoTotal) ||
      cantidad <= 0 ||
      costoTotal <= 0
    ) {
      return null
    }

    return (
      costoTotal /
      cantidad
    )
  }

  const manejarSubmit = async (event) => {
    event.preventDefault()

    setError(null)

    if (!glosa.trim()) {
      setError(
        'La glosa / motivo es obligatoria.'
      )

      return
    }

    const payloadDetalles = []

    for (
      let i = 0;
      i < detalles.length;
      i += 1
    ) {
      const detalle =
        detalles[i]

      if (!detalle.id_almacen) {
        setError(
          `Seleccione un almacén para el ítem #${i + 1}`
        )

        return
      }

      if (!detalle.id_item) {
        setError(
          `Seleccione un producto o materia prima para el ítem #${i + 1}`
        )

        return
      }

      const cantidad =
        Number(
          detalle.cantidad
        )

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
        detalle.tipo ===
        'materia_prima'
      ) {
        const costoTotal =
          Number(
            detalle.costo_total
          )

        if (
          !Number.isFinite(
            costoTotal
          ) ||
          costoTotal <= 0
        ) {
          setError(
            `Ingrese el precio total pagado para la materia prima del ítem #${i + 1}`
          )

          return
        }
      }

      payloadDetalles.push({
        id_almacen:
          Number(
            detalle.id_almacen
          ),

        cantidad,

        id_materia_prima:
          detalle.tipo ===
          'materia_prima'
            ? Number(
                detalle.id_item
              )
            : null,

        id_producto_presentacion:
          detalle.tipo ===
          'producto'
            ? Number(
                detalle.id_item
              )
            : null,

        costo_total:
          detalle.tipo ===
          'materia_prima'
            ? Number(
                detalle.costo_total
              )
            : null,
      })
    }

    try {
      setGuardando(true)

      await crearIngreso({
        glosa:
          glosa.trim(),

        detalles:
          payloadDetalles,
      })

      navigate(
        '/inventario/ingresos'
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al registrar el ingreso.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Nuevo Ingreso de Inventario
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
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
          <div className="rounded-lg bg-white p-6 shadow">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Datos Generales
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Información del ingreso de inventario.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label
                  htmlFor="glosa"
                  className="block text-sm font-medium text-gray-700"
                >
                  Glosa / Motivo *
                </label>

                <div className="mt-1">
                  <input
                    type="text"
                    name="glosa"
                    id="glosa"
                    required
                    value={
                      glosa
                    }
                    onChange={(
                      event
                    ) =>
                      setGlosa(
                        event
                          .target
                          .value
                      )
                    }
                    className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                    placeholder="Ej. Compra de materias primas"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 pt-6 shadow">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Detalles del Ingreso
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Agrega los productos o materias primas que ingresarán al inventario.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Para materias primas debe registrarse también el precio total pagado.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {detalles.map(
                (
                  detalle,
                  index
                ) => {
                  const costoUnitario =
                    obtenerCostoUnitario(
                      detalle
                    )

                  const unidad =
                    obtenerUnidadMateriaPrima(
                      detalle
                    )

                  return (
                    <div
                      key={
                        index
                      }
                      className="flex flex-col flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row"
                    >
                      <div className="w-full sm:w-48">
                        <label className="block text-sm font-medium text-gray-700">
                          Tipo de Ítem
                        </label>

                        <select
                          value={
                            detalle.tipo
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarDetalle(
                              index,
                              'tipo',
                              event
                                .target
                                .value
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm"
                        >
                          <option value="materia_prima">
                            Materia Prima
                          </option>

                          <option value="producto">
                            Producto/Presentación
                          </option>
                        </select>
                      </div>

                      <div className="w-full sm:min-w-64 sm:flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Ítem *
                        </label>

                        <select
                          value={
                            detalle.id_item
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarDetalle(
                              index,
                              'id_item',
                              event
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

                          {detalle.tipo ===
                          'materia_prima'
                            ? materiasPrimas.map(
                                (
                                  materia
                                ) => (
                                  <option
                                    key={
                                      materia.id_materia_prima
                                    }
                                    value={
                                      materia.id_materia_prima
                                    }
                                  >
                                    {
                                      materia.nombre
                                    }{' '}
                                    (
                                    {
                                      materia.unidad_medida
                                    }
                                    )
                                  </option>
                                )
                              )
                            : presentacionesPlanificadas.map(
                                (
                                  presentacion
                                ) => (
                                  <option
                                    key={
                                      presentacion.id_producto_presentacion
                                    }
                                    value={
                                      presentacion.id_producto_presentacion
                                    }
                                  >
                                    {
                                      presentacion.nombre_producto
                                    }{' '}
                                    -{' '}
                                    {
                                      presentacion.nombre_presentacion
                                    }
                                  </option>
                                )
                              )}
                        </select>
                      </div>

                      <div className="w-full sm:w-52">
                        <label className="block text-sm font-medium text-gray-700">
                          Almacén Destino *
                        </label>

                        <select
                          value={
                            detalle.id_almacen
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarDetalle(
                              index,
                              'id_almacen',
                              event
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

                      <div className="w-full sm:w-32">
                        <label className="block text-sm font-medium text-gray-700">
                          Cantidad *
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={
                            detalle.cantidad
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarDetalle(
                              index,
                              'cantidad',
                              event
                                .target
                                .value
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                        />
                      </div>

                      {detalle.tipo ===
                        'materia_prima' && (
                        <div className="w-full sm:w-52">
                          <label className="block text-sm font-medium text-gray-700">
                            Precio total pagado (Bs) *
                          </label>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={
                              detalle.costo_total
                            }
                            onChange={(
                              event
                            ) =>
                              actualizarDetalle(
                                index,
                                'costo_total',
                                event
                                  .target
                                  .value
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                            placeholder="Ej. 80.00"
                          />

                          {costoUnitario !==
                            null && (
                            <p className="mt-1 text-xs text-gray-500">
                              Costo unitario:{' '}
                              <span className="font-medium">
                                Bs{' '}
                                {costoUnitario.toFixed(
                                  4
                                )}
                                {unidad
                                  ? ` / ${unidad}`
                                  : ''}
                              </span>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="w-full pb-1 sm:w-auto">
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
                          title="Eliminar ítem"
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white p-2 text-red-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
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

          <div className="flex justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/inventario/ingresos'
                )
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
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
                ? 'Guardando...'
                : 'Guardar Ingreso'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
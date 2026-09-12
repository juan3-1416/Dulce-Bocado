import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  listarRecetas,
} from '../../services/recetaService'

import {
  crearProduccion,
} from '../../services/produccionService'

function ProduccionForm() {
  const navigate =
    useNavigate()

  const [
    productosPresentaciones,
    setProductosPresentaciones,
  ] = useState([])

  const [
    recetas,
    setRecetas,
  ] = useState([])

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    formulario,
    setFormulario,
  ] = useState({
    id_producto_presentacion: '',
    cantidad: 1,
    observaciones: '',
  })

  /*
  |--------------------------------------------------------------------------
  | Cargar presentaciones vinculadas a productos y recetas
  |--------------------------------------------------------------------------
  */
useEffect(() => {
  let activo = true

  const cargarDatos = async () => {
    try {
      setCargandoCatalogos(true)
      setError('')

      const recetasRespuesta =
        await listarRecetas({
          estado: '1',
        })

      if (!activo) {
        return
      }

      const listaRecetas =
        recetasRespuesta?.recetas ?? []

      /*
       * Producción solamente puede utilizar
       * presentaciones que tengan receta activa.
       */
      const presentacionesConReceta =
        listaRecetas
          .map((receta) => ({
            ...receta.producto_presentacion,
            receta,
          }))
          .filter(
            (item) =>
              item?.id_producto_presentacion &&
              item?.producto &&
              item?.presentacion
          )

      setRecetas(listaRecetas)

      setProductosPresentaciones(
        presentacionesConReceta
      )
    } catch (err) {
      if (!activo) {
        return
      }

      setError(
        err.message ||
          'No se pudieron cargar las presentaciones con receta.'
      )
    } finally {
      if (activo) {
        setCargandoCatalogos(false)
      }
    }
  }

  cargarDatos()

  return () => {
    activo = false
  }
}, [])
  /*
  |--------------------------------------------------------------------------
  | Producto / Presentación seleccionado
  |--------------------------------------------------------------------------
  */
  const presentacionSeleccionada =
    useMemo(() => {
      if (
        !formulario
          .id_producto_presentacion
      ) {
        return null
      }

      return (
        productosPresentaciones.find(
          (item) =>
            Number(
              item
                .id_producto_presentacion
            ) ===
            Number(
              formulario
                .id_producto_presentacion
            )
        ) ?? null
      )
    }, [
      formulario
        .id_producto_presentacion,
      productosPresentaciones,
    ])

  /*
  |--------------------------------------------------------------------------
  | Receta asociada
  |--------------------------------------------------------------------------
  */
const recetaActual =
  useMemo(() => {
    if (
      !formulario.id_producto_presentacion
    ) {
      return null
    }

    const idSeleccionado =
      Number(
        formulario.id_producto_presentacion
      )

    return (
      recetas.find(
        (receta) =>
          Number(
            receta
              .producto_presentacion
              ?.id_producto_presentacion
          ) === idSeleccionado
      ) ?? null
    )
  }, [
    formulario.id_producto_presentacion,
    recetas,
  ])
  /*
  |--------------------------------------------------------------------------
  | Calcular requerimientos teóricos
  |--------------------------------------------------------------------------
  |
  | El frontend solamente muestra una vista previa.
  | La validación definitiva del stock la realiza Laravel.
  |--------------------------------------------------------------------------
  */
  const insumos =
    useMemo(() => {
      if (
        !recetaActual ||
        !Array.isArray(
          recetaActual.detalles
        )
      ) {
        return []
      }

      const cantidadProduccion =
        Number(
          formulario.cantidad ||
            0
        )

      return recetaActual
        .detalles
        .map(
          (detalle) => {
            const cantidadReceta =
              Number(
                detalle
                  .cantidad ||
                  0
              )

            return {
              ...detalle,

              requerido:
                cantidadReceta *
                cantidadProduccion,
            }
          }
        )
    }, [
      formulario.cantidad,
      recetaActual,
    ])

  const hayReceta =
    Boolean(
      recetaActual
    )

  const esValido =
    Boolean(
      formulario
        .id_producto_presentacion
    ) &&
    Number(
      formulario.cantidad
    ) >= 1 &&
    hayReceta

  /*
  |--------------------------------------------------------------------------
  | Cambios de formulario
  |--------------------------------------------------------------------------
  */
  const manejarCambio = (
    evento
  ) => {
    const {
      name,
      value,
    } = evento.target

    setError('')

    setFormulario(
      (actual) => ({
        ...actual,

        [name]:
          name ===
          'cantidad'
            ? Number(value) ||
              0
            : value,
      })
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Obtener mensaje del backend
  |--------------------------------------------------------------------------
  */
  const obtenerMensajeError = (
    err
  ) => {
    if (
      Array.isArray(
        err?.data
          ?.faltantes
      ) &&
      err.data.faltantes
        .length > 0
    ) {
      const faltantes =
        err.data.faltantes
          .map(
            (item) =>
              `${item.materia_prima}: requiere ${item.requerido}, disponible ${item.disponible}`
          )
          .join(' | ')

      return `${
        err.message ||
        'Stock insuficiente.'
      } ${faltantes}`
    }

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
        )
      ) {
        return primerError[0]
      }
    }

    return (
      err.message ||
      'No se pudo crear la orden de producción.'
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Crear orden
  |--------------------------------------------------------------------------
  */
  const manejarSubmit =
    async (evento) => {
      evento.preventDefault()

      setError('')

      if (
        !formulario
          .id_producto_presentacion
      ) {
        setError(
          'Seleccione un producto y presentación.'
        )

        return
      }

      if (
        Number(
          formulario.cantidad
        ) < 1
      ) {
        setError(
          'La cantidad a producir debe ser mayor a 0.'
        )

        return
      }

      if (!hayReceta) {
        setError(
          'La presentación seleccionada no tiene una receta activa asociada.'
        )

        return
      }

      try {
        setGuardando(true)

        await crearProduccion({
          id_producto_presentacion:
            Number(
              formulario
                .id_producto_presentacion
            ),

          cantidad:
            Number(
              formulario.cantidad
            ),

          observaciones:
            formulario
              .observaciones
              .trim() ||
            null,
        })

        navigate(
          '/produccion'
        )
      } catch (err) {
        setError(
          obtenerMensajeError(
            err
          )
        )
      } finally {
        setGuardando(false)
      }
    }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nueva Producción
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Crea una orden de
            producción a partir de
            una receta registrada.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/produccion'
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Volver a lista
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={
          manejarSubmit
        }
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Producto /
              Presentación
            </label>

            <select
              name="id_producto_presentacion"
              value={
                formulario
                  .id_producto_presentacion
              }
              onChange={
                manejarCambio
              }
              disabled={
                cargandoCatalogos
              }
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-slate-100"
            >
              <option value="">
                {cargandoCatalogos
                  ? 'Cargando presentaciones...'
                  : 'Seleccione una presentación'}
              </option>

              {productosPresentaciones.map(
                (item) => (
                  <option
                    key={
                      item
                        .id_producto_presentacion
                    }
                    value={
                      item
                        .id_producto_presentacion
                    }
                  >
                    {item
                      .producto
                      ?.nombre ||
                      'Producto'}
                    {' / '}
                    {item
                      .presentacion
                      ?.nombre ||
                      'Presentación'}
                  </option>
                )
              )}
            </select>

            {!cargandoCatalogos &&
              productosPresentaciones.length ===
                0 && (
                <p className="mt-1 text-xs text-red-600">
                  No existen
                  productos con
                  presentaciones
                  disponibles.
                </p>
              )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cantidad a producir
            </label>

            <input
              type="number"
              name="cantidad"
              min="1"
              step="1"
              value={
                formulario
                  .cantidad
              }
              onChange={
                manejarCambio
              }
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        {presentacionSeleccionada && (
          <div className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-600">
                Producto
              </p>

              <p className="mt-1 font-semibold text-blue-900">
                {presentacionSeleccionada
                  .producto
                  ?.nombre ||
                  '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-blue-600">
                Presentación
              </p>

              <p className="mt-1 font-semibold text-blue-900">
                {presentacionSeleccionada
                  .presentacion
                  ?.nombre ||
                  '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-blue-600">
                Precio referencial
              </p>

              <p className="mt-1 font-semibold text-blue-900">
                Bs{' '}
                {Number(
                  presentacionSeleccionada
                    .precio ??
                    0
                ).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observaciones
          </label>

          <textarea
            name="observaciones"
            rows="3"
            value={
              formulario
                .observaciones
            }
            onChange={
              manejarCambio
            }
            placeholder="Ej. Producción de prueba para validar CU17."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        {formulario
          .id_producto_presentacion && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {!hayReceta ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                La presentación
                seleccionada no tiene
                una receta activa
                asociada.
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Materias primas
                    requeridas
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Cálculo según la
                    receta y la cantidad
                    que deseas producir.
                    El stock será
                    verificado nuevamente
                    por el sistema al
                    crear la orden.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                          Materia Prima
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                          Por unidad
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                          Requerido
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                          Unidad
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {insumos.map(
                        (insumo) => (
                          <tr
                            key={
                              insumo
                                .id_detalle_receta ??
                              insumo
                                .id_materia_prima
                            }
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                              {insumo
                                .materia_prima
                                ?.nombre ||
                                'Materia prima'}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-slate-700">
                              {Number(
                                insumo
                                  .cantidad ??
                                  0
                              ).toFixed(
                                3
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                              {Number(
                                insumo
                                  .requerido ??
                                  0
                              ).toFixed(
                                3
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-slate-700">
                              {insumo
                                .materia_prima
                                ?.unidad_medida ||
                                '—'}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                '/produccion'
              )
            }
            disabled={
              guardando
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              guardando ||
              cargandoCatalogos ||
              !esValido
            }
            className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? 'Creando orden...'
              : 'Crear Orden'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProduccionForm
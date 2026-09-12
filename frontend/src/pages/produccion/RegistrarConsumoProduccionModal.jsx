import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  obtenerConsumoProduccion,
  registrarConsumoProduccion,
} from '../../services/produccionService'

function formatearNumero(
  valor,
  decimales = 3
) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return (0).toFixed(decimales)
  }

  return numero.toFixed(decimales)
}

function obtenerMensajeError(errorPeticion) {
  const errores =
    errorPeticion?.data?.errors

  if (errores) {
    const primerError =
      Object.values(errores)[0]

    if (
      Array.isArray(primerError) &&
      primerError.length > 0
    ) {
      return primerError[0]
    }
  }

  return (
    errorPeticion?.message ||
    'No se pudo registrar el consumo de producción.'
  )
}

function RegistrarConsumoProduccionModal({
  isOpen,
  produccion,
  onClose,
  onSuccess,
}) {
  const [
    cargando,
    setCargando,
  ] = useState(false)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    datosProduccion,
    setDatosProduccion,
  ] = useState(null)

  const [
    unidadesBuenas,
    setUnidadesBuenas,
  ] = useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [
    consumos,
    setConsumos,
  ] = useState([])

  useEffect(() => {
    if (
      !isOpen ||
      !produccion?.id_produccion
    ) {
      return
    }

    let activo = true

    async function cargarDatos() {
      try {
        setCargando(true)
        setError('')
        setDatosProduccion(null)
        setObservaciones('')

        const respuesta =
          await obtenerConsumoProduccion(
            produccion.id_produccion
          )

        if (!activo) {
          return
        }

        setDatosProduccion(
          respuesta
        )

        const cantidadPlanificada =
          Number(
            respuesta
              ?.cantidad_planificada ??
              0
          )

        setUnidadesBuenas(
          cantidadPlanificada > 0
            ? String(
                Math.trunc(
                  cantidadPlanificada
                )
              )
            : ''
        )

        const materias =
          respuesta
            ?.materias_primas ??
          []

        setConsumos(
          materias.map(
            (materia) => ({
              id_materia_prima:
                materia
                  .id_materia_prima,

              nombre:
                materia.nombre,

              unidad_medida:
                materia.unidad_medida,

              cantidad_teorica:
                Number(
                  materia
                    .cantidad_teorica ??
                    0
                ),

              stock_actual:
                Number(
                  materia
                    .stock_actual ??
                    0
                ),

              costo_unitario:
                Number(
                  materia
                    .costo_unitario ??
                    0
                ),

              cantidad_consumida:
                String(
                  materia
                    .cantidad_teorica ??
                    ''
                ),

              cantidad_desperdicio:
                '0',

              observaciones:
                '',
            })
          )
        )
      } catch (err) {
        if (activo) {
          setError(
            obtenerMensajeError(
              err
            )
          )
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarDatos()

    return () => {
      activo = false
    }
  }, [
    isOpen,
    produccion?.id_produccion,
  ])

  const actualizarConsumo = (
    idMateriaPrima,
    campo,
    valor
  ) => {
    setConsumos(
      (actuales) =>
        actuales.map(
          (item) =>
            item.id_materia_prima ===
            idMateriaPrima
              ? {
                  ...item,
                  [campo]: valor,
                }
              : item
        )
    )
  }

  const costoTotal =
    useMemo(
      () =>
        consumos.reduce(
          (
            total,
            item
          ) => {
            const consumo =
              Number(
                item
                  .cantidad_consumida
              ) || 0

            const desperdicio =
              Number(
                item
                  .cantidad_desperdicio
              ) || 0

            const costoUnitario =
              Number(
                item
                  .costo_unitario
              ) || 0

            return (
              total +
              (
                consumo +
                desperdicio
              ) *
                costoUnitario
            )
          },
          0
        ),
      [consumos]
    )

  const desperdicioTotal =
    useMemo(
      () =>
        consumos.reduce(
          (
            total,
            item
          ) =>
            total +
            (
              Number(
                item
                  .cantidad_desperdicio
              ) || 0
            ),
          0
        ),
      [consumos]
    )

  if (
    !isOpen ||
    !produccion
  ) {
    return null
  }

  const manejarSubmit =
    async (evento) => {
      evento.preventDefault()

      setError('')

      const buenas =
        Number(
          unidadesBuenas
        )

      if (
        !Number.isInteger(
          buenas
        ) ||
        buenas < 0
      ) {
        setError(
          'Las unidades buenas deben ser un número entero mayor o igual a 0.'
        )

        return
      }

      if (
        consumos.length === 0
      ) {
        setError(
          'No existen materias primas para registrar.'
        )

        return
      }

      for (
        const item
        of consumos
      ) {
        const consumida =
          Number(
            item
              .cantidad_consumida
          )

        const desperdicio =
          Number(
            item
              .cantidad_desperdicio
          )

        if (
          !Number.isFinite(
            consumida
          ) ||
          consumida < 0
        ) {
          setError(
            `La cantidad consumida de ${item.nombre} no es válida.`
          )

          return
        }

        if (
          !Number.isFinite(
            desperdicio
          ) ||
          desperdicio < 0
        ) {
          setError(
            `El desperdicio de ${item.nombre} no es válido.`
          )

          return
        }

        const salidaTotal =
          consumida +
          desperdicio

        if (
          salidaTotal <= 0
        ) {
          setError(
            `Debe registrar una cantidad mayor a cero para ${item.nombre}.`
          )

          return
        }

        if (
          salidaTotal >
          item.stock_actual
        ) {
          setError(
            `Stock insuficiente de ${item.nombre}. Disponible: ${formatearNumero(
              item.stock_actual,
              3
            )} ${item.unidad_medida}.`
          )

          return
        }

        if (
          item.costo_unitario <=
          0
        ) {
          setError(
            `La materia prima ${item.nombre} no tiene un costo unitario válido.`
          )

          return
        }
      }

      const payload = {
        unidades_buenas:
          buenas,

        observaciones:
          observaciones.trim() ||
          null,

        consumos:
          consumos.map(
            (item) => ({
              id_materia_prima:
                item
                  .id_materia_prima,

              cantidad_consumida:
                Number(
                  item
                    .cantidad_consumida
                ),

              cantidad_desperdicio:
                Number(
                  item
                    .cantidad_desperdicio
                ),

              observaciones:
                item
                  .observaciones
                  ?.trim() ||
                null,
            })
          ),
      }

      try {
        setGuardando(true)

        const respuesta =
          await registrarConsumoProduccion(
            produccion
              .id_produccion,
            payload
          )

        if (onSuccess) {
          await onSuccess(
            respuesta
          )
        }

        onClose()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              CU17 · Producción
            </p>

            <h2 className="text-xl font-bold text-slate-900">
              Registrar consumo
              {' '}
              #
              {
                produccion
                  .id_produccion
              }
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registra consumo real,
              desperdicio, costo y
              unidades buenas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              guardando
            }
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={
            manejarSubmit
          }
          className="max-h-[calc(92vh-90px)] overflow-y-auto"
        >
          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {cargando ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Cargando información
                de producción...
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Orden
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      #
                      {
                        produccion
                          .id_produccion
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">
                      Planificado
                    </p>

                    <p className="mt-1 text-lg font-bold text-blue-800">
                      {formatearNumero(
                        datosProduccion
                          ?.cantidad_planificada,
                        0
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase text-orange-700">
                      Desperdicio
                    </p>

                    <p className="mt-1 text-lg font-bold text-orange-800">
                      {formatearNumero(
                        desperdicioTotal,
                        3
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs font-semibold uppercase text-green-700">
                      Costo calculado
                    </p>

                    <p className="mt-1 text-lg font-bold text-green-800">
                      Bs{' '}
                      {formatearNumero(
                        costoTotal,
                        4
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-base font-bold text-slate-900">
                    Materias primas
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                            Stock
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Consumo real
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
                        {consumos.map(
                          (item) => {
                            const consumo =
                              Number(
                                item
                                  .cantidad_consumida
                              ) ||
                              0

                            const desperdicio =
                              Number(
                                item
                                  .cantidad_desperdicio
                              ) ||
                              0

                            const costo =
                              (
                                consumo +
                                desperdicio
                              ) *
                              (
                                Number(
                                  item
                                    .costo_unitario
                                ) ||
                                0
                              )

                            return (
                              <tr
                                key={
                                  item
                                    .id_materia_prima
                                }
                              >
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {
                                      item.nombre
                                    }
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Bs{' '}
                                    {formatearNumero(
                                      item
                                        .costo_unitario,
                                      4
                                    )}
                                    {' / '}
                                    {
                                      item
                                        .unidad_medida
                                    }
                                  </p>
                                </td>

                                <td className="px-4 py-4 text-right text-sm text-slate-700">
                                  {formatearNumero(
                                    item
                                      .cantidad_teorica,
                                    3
                                  )}
                                  {' '}
                                  {
                                    item
                                      .unidad_medida
                                  }
                                </td>

                                <td className="px-4 py-4 text-right text-sm text-slate-700">
                                  {formatearNumero(
                                    item
                                      .stock_actual,
                                    3
                                  )}
                                  {' '}
                                  {
                                    item
                                      .unidad_medida
                                  }
                                </td>

                                <td className="min-w-40 px-4 py-4">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={
                                      item
                                        .cantidad_consumida
                                    }
                                    onChange={(
                                      evento
                                    ) =>
                                      actualizarConsumo(
                                        item
                                          .id_materia_prima,
                                        'cantidad_consumida',
                                        evento
                                          .target
                                          .value
                                      )
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  />
                                </td>

                                <td className="min-w-40 px-4 py-4">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    required
                                    value={
                                      item
                                        .cantidad_desperdicio
                                    }
                                    onChange={(
                                      evento
                                    ) =>
                                      actualizarConsumo(
                                        item
                                          .id_materia_prima,
                                        'cantidad_desperdicio',
                                        evento
                                          .target
                                          .value
                                      )
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  />
                                </td>

                                <td className="px-4 py-4 text-right text-sm font-semibold text-slate-800">
                                  Bs{' '}
                                  {formatearNumero(
                                    costo,
                                    4
                                  )}
                                </td>
                              </tr>
                            )
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Unidades buenas
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={
                        unidadesBuenas
                      }
                      onChange={(
                        evento
                      ) =>
                        setUnidadesBuenas(
                          evento
                            .target
                            .value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Solo estas unidades
                      serán registradas como
                      producto terminado.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Observaciones
                    </label>

                    <textarea
                      rows="3"
                      value={
                        observaciones
                      }
                      onChange={(
                        evento
                      ) =>
                        setObservaciones(
                          evento
                            .target
                            .value
                        )
                      }
                      placeholder="Observaciones generales de la producción..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
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
                cargando
              }
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando
                ? 'Registrando...'
                : 'Registrar y completar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegistrarConsumoProduccionModal
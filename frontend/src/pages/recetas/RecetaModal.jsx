import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  actualizarReceta,
  crearReceta,
} from '../../services/recetaService'

function RecetaModal({
  abierto,
  onCerrar,
  onGuardado,
  productosPresentaciones,
  materiasPrimas,
  receta = null,
}) {
  const esEdicion = Boolean(receta)

  const [
    idProductoPresentacion,
    setIdProductoPresentacion,
  ] = useState('')

  const [observaciones, setObservaciones] =
    useState('')

  const [ingredientes, setIngredientes] =
    useState([
      {
        id_materia_prima: '',
        cantidad: '',
      },
    ])

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!abierto) {
      return
    }

    setError('')

    if (receta) {
      setIdProductoPresentacion(
        String(
          receta.id_producto_presentacion ??
            ''
        )
      )

      setObservaciones(
        receta.observaciones ?? ''
      )

      setIngredientes(
        receta.detalles?.length
          ? receta.detalles.map(
              (detalle) => ({
                id_materia_prima:
                  String(
                    detalle.id_materia_prima
                  ),

                cantidad:
                  String(
                    detalle.cantidad
                  ),
              })
            )
          : [
              {
                id_materia_prima: '',
                cantidad: '',
              },
            ]
      )

      return
    }

    setIdProductoPresentacion('')
    setObservaciones('')

    setIngredientes([
      {
        id_materia_prima: '',
        cantidad: '',
      },
    ])
  }, [abierto, receta])

  const idsSeleccionados = useMemo(
    () =>
      ingredientes
        .map((ingrediente) =>
          Number(
            ingrediente.id_materia_prima
          )
        )
        .filter(Boolean),
    [ingredientes]
  )

  const agregarIngrediente = () => {
    setIngredientes((actuales) => [
      ...actuales,
      {
        id_materia_prima: '',
        cantidad: '',
      },
    ])
  }

  const quitarIngrediente = (indice) => {
    setIngredientes((actuales) =>
      actuales.filter(
        (_, posicion) =>
          posicion !== indice
      )
    )
  }

  const cambiarIngrediente = (
    indice,
    campo,
    valor
  ) => {
    setIngredientes((actuales) =>
      actuales.map(
        (ingrediente, posicion) =>
          posicion === indice
            ? {
                ...ingrediente,
                [campo]: valor,
              }
            : ingrediente
      )
    )
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
      'No se pudo guardar la receta.'
    )
  }

  const manejarSubmit = async (event) => {
    event.preventDefault()

    if (
      !esEdicion &&
      !idProductoPresentacion
    ) {
      setError(
        'Selecciona un producto y presentación.'
      )
      return
    }

    const ingredientesValidos =
      ingredientes.filter(
        (ingrediente) =>
          ingrediente.id_materia_prima &&
          Number(
            ingrediente.cantidad
          ) > 0
      )

    if (
      ingredientesValidos.length === 0
    ) {
      setError(
        'Agrega al menos un ingrediente válido.'
      )
      return
    }

    if (
      ingredientesValidos.length !==
      ingredientes.length
    ) {
      setError(
        'Completa correctamente todos los ingredientes.'
      )
      return
    }

    try {
      setGuardando(true)
      setError('')

      const datosComunes = {
        observaciones:
          observaciones || null,

        estado:
          receta?.estado ?? true,

        ingredientes:
          ingredientesValidos.map(
            (ingrediente) => ({
              id_materia_prima:
                Number(
                  ingrediente.id_materia_prima
                ),

              cantidad:
                Number(
                  ingrediente.cantidad
                ),
            })
          ),
      }

      if (esEdicion) {
        await actualizarReceta(
          receta.id_receta,
          datosComunes
        )
      } else {
        await crearReceta({
          ...datosComunes,

          id_producto_presentacion:
            Number(
              idProductoPresentacion
            ),
        })
      }

      await onGuardado(
        esEdicion
          ? 'Receta actualizada correctamente.'
          : 'Receta registrada correctamente.'
      )

      onCerrar()
    } catch (errorPeticion) {
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

  const productoActual =
    receta
      ?.producto_presentacion
      ?.producto
      ?.nombre ?? ''

  const presentacionActual =
    receta
      ?.producto_presentacion
      ?.presentacion
      ?.nombre ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {esEdicion
                ? 'Editar Receta'
                : 'Nueva Receta'}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {esEdicion
                ? 'Modifica ingredientes, cantidades y observaciones.'
                : 'Define la receta para una presentación concreta del producto.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={manejarSubmit}
          className="space-y-6 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Producto y presentación
            </label>

            {esEdicion ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                {productoActual}
                {' — '}
                {presentacionActual}
              </div>
            ) : (
              <select
                value={
                  idProductoPresentacion
                }
                onChange={(event) =>
                  setIdProductoPresentacion(
                    event.target.value
                  )
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">
                  Seleccionar
                </option>

                {productosPresentaciones.map(
                  (item) => (
                    <option
                      key={
                        item.id_producto_presentacion
                      }
                      value={
                        item.id_producto_presentacion
                      }
                    >
                      {
                        item.producto
                          ?.nombre
                      }
                      {' — '}
                      {
                        item.presentacion
                          ?.nombre
                      }
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observaciones
            </label>

            <textarea
              value={observaciones}
              onChange={(event) =>
                setObservaciones(
                  event.target.value
                )
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Indicaciones adicionales..."
            />
          </div>

          <div className="space-y-3">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Ingredientes
                </h3>

                <p className="text-sm text-gray-500">
                  Las cantidades corresponden a una unidad de esta presentación.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  agregarIngrediente
                }
                className="rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
              >
                + Ingrediente
              </button>
            </div>

            {ingredientes.map(
              (
                ingrediente,
                indice
              ) => (
                <div
                  key={indice}
                  className="grid gap-3 rounded-xl border border-gray-200 p-4 md:grid-cols-[1fr_180px_auto]"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Materia prima
                    </label>

                    <select
                      value={
                        ingrediente.id_materia_prima
                      }
                      onChange={(
                        event
                      ) =>
                        cambiarIngrediente(
                          indice,
                          'id_materia_prima',
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {materiasPrimas.map(
                        (
                          materiaPrima
                        ) => {
                          const id =
                            materiaPrima.id_materia_prima

                          const seleccionadaEnOtraFila =
                            idsSeleccionados.includes(
                              id
                            ) &&
                            Number(
                              ingrediente.id_materia_prima
                            ) !== id

                          return (
                            <option
                              key={id}
                              value={id}
                              disabled={
                                seleccionadaEnOtraFila
                              }
                            >
                              {
                                materiaPrima.nombre
                              }
                              {' ('}
                              {
                                materiaPrima.unidad_medida
                              }
                              {')'}
                            </option>
                          )
                        }
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Cantidad
                    </label>

                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={
                        ingrediente.cantidad
                      }
                      onChange={(
                        event
                      ) =>
                        cambiarIngrediente(
                          indice,
                          'cantidad',
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={
                        ingredientes.length ===
                        1
                      }
                      onClick={() =>
                        quitarIngrediente(
                          indice
                        )
                      }
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : esEdicion
                  ? 'Guardar Cambios'
                  : 'Guardar Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RecetaModal
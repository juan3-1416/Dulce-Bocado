import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  actualizarMateriaPrima,
  cambiarEstadoMateriaPrima,
  crearMateriaPrima,
  listarMateriasPrimas,
} from '../../services/materiaPrimaService'

function MateriasPrimasPage() {
  const [materiasPrimas, setMateriasPrimas] =
    useState([])

  const [buscar, setBuscar] =
    useState('')

  const [estado, setEstado] =
    useState('')

  const [modalAbierto, setModalAbierto] =
    useState(false)

  const [
    materiaPrimaSeleccionada,
    setMateriaPrimaSeleccionada,
  ] = useState(null)

  const [nombre, setNombre] =
    useState('')

  const [
    unidadMedida,
    setUnidadMedida,
  ] = useState('g')

  const [
    descripcion,
    setDescripcion,
  ] = useState('')

  const [cargando, setCargando] =
    useState(true)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarMateriasPrimas =
    useCallback(async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta =
          await listarMateriasPrimas({
            buscar,
            estado,
          })

        setMateriasPrimas(
          respuesta.materias_primas ??
            []
        )
      } catch (errorPeticion) {
        setError(
          errorPeticion.message ||
            'No se pudieron cargar las materias primas.'
        )
      } finally {
        setCargando(false)
      }
    }, [buscar, estado])

  useEffect(() => {
    const temporizador =
      setTimeout(() => {
        cargarMateriasPrimas()
      }, 300)

    return () =>
      clearTimeout(temporizador)
  }, [cargarMateriasPrimas])

  const abrirNueva = () => {
    setMateriaPrimaSeleccionada(null)
    setNombre('')
    setUnidadMedida('g')
    setDescripcion('')
    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const abrirEditar = (
    materiaPrima
  ) => {
    setMateriaPrimaSeleccionada(
      materiaPrima
    )

    setNombre(
      materiaPrima.nombre ?? ''
    )

    setUnidadMedida(
      materiaPrima.unidad_medida ?? 'g'
    )

    setDescripcion(
      materiaPrima.descripcion ?? ''
    )

    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setMateriaPrimaSeleccionada(null)
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
      'No se pudo guardar la materia prima.'
    )
  }

  const guardar = async (event) => {
    event.preventDefault()

    try {
      setGuardando(true)
      setError('')

      const datos = {
        nombre,
        unidad_medida:
          unidadMedida,
        descripcion:
          descripcion || null,
        estado:
          materiaPrimaSeleccionada
            ?.estado ?? true,
      }

      if (
        materiaPrimaSeleccionada
      ) {
        await actualizarMateriaPrima(
          materiaPrimaSeleccionada
            .id_materia_prima,
          datos
        )

        setMensaje(
          'Materia prima actualizada correctamente.'
        )
      } else {
        await crearMateriaPrima(
          datos
        )

        setMensaje(
          'Materia prima registrada correctamente.'
        )
      }

      cerrarModal()
      await cargarMateriasPrimas()
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

  const cambiarEstado = async (
    materiaPrima
  ) => {
    try {
      setError('')
      setMensaje('')

      const nuevoEstado =
        !materiaPrima.estado

      await cambiarEstadoMateriaPrima(
        materiaPrima.id_materia_prima,
        nuevoEstado
      )

      setMensaje(
        nuevoEstado
          ? 'Materia prima activada correctamente.'
          : 'Materia prima desactivada correctamente.'
      )

      await cargarMateriasPrimas()
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudo cambiar el estado de la materia prima.'
      )
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Materias Primas
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Administra los ingredientes utilizados en las recetas.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNueva}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Nueva Materia Prima
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
            htmlFor="buscar_materia"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Buscar
          </label>

          <input
            id="buscar_materia"
            type="text"
            value={buscar}
            onChange={(event) =>
              setBuscar(
                event.target.value
              )
            }
            placeholder="Ej. Harina"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="estado_materia"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Estado
          </label>

          <select
            id="estado_materia"
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

            <option value="1">
              Activas
            </option>

            <option value="0">
              Inactivas
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">
            Cargando materias primas...
          </div>
        ) : materiasPrimas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No existen materias primas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Nombre
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Unidad
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Descripción
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {materiasPrimas.map(
                  (materiaPrima) => (
                    <tr
                      key={
                        materiaPrima.id_materia_prima
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {
                          materiaPrima.nombre
                        }
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {
                          materiaPrima.unidad_medida
                        }
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {
                          materiaPrima.descripcion ||
                          '—'
                        }
                      </td>

                      <td className="px-6 py-4">
                        {materiaPrima.estado ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Inactiva
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                materiaPrima
                              )
                            }
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(
                                materiaPrima
                              )
                            }
                            className={
                              materiaPrima.estado
                                ? 'rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50'
                                : 'rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-600 hover:bg-green-50'
                            }
                          >
                            {materiaPrima.estado
                              ? 'Desactivar'
                              : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {materiaPrimaSeleccionada
                  ? 'Editar Materia Prima'
                  : 'Nueva Materia Prima'}
              </h2>
            </div>

            <form
              onSubmit={guardar}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(event) =>
                    setNombre(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unidad de medida
                </label>

                <select
                  value={unidadMedida}
                  onChange={(event) =>
                    setUnidadMedida(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="g">
                    Gramos (g)
                  </option>

                  <option value="ml">
                    Mililitros (ml)
                  </option>

                  <option value="unidad">
                    Unidad
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(event) =>
                    setDescripcion(
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={cerrarModal}
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
                    : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default MateriasPrimasPage
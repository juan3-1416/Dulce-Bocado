import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import RecetaModal from './RecetaModal'

import {
  listarRecetas,
  obtenerCatalogosReceta,
  cambiarEstadoReceta,
} from '../../services/recetaService'

function RecetasPage() {
  const [recetas, setRecetas] =
    useState([])

  const [buscar, setBuscar] =
    useState('')

  const [estado, setEstado] =
    useState('')

  const [
    productosPresentaciones,
    setProductosPresentaciones,
  ] = useState([])

  const [
    materiasPrimas,
    setMateriasPrimas,
  ] = useState([])

  const [modalAbierto, setModalAbierto] =
    useState(false)

    const [
  recetaSeleccionada,
  setRecetaSeleccionada,
] = useState(null)

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarRecetas =
    useCallback(async () => {
      try {
        setCargando(true)
        setError('')

        const respuesta =
          await listarRecetas({
            buscar,
            estado,
          })

        setRecetas(
          respuesta.recetas ?? []
        )
      } catch (errorPeticion) {
        if (
          errorPeticion.status === 403
        ) {
          setError(
            'No tienes permiso para gestionar recetas.'
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
              'No se pudieron cargar las recetas.'
          )
        }
      } finally {
        setCargando(false)
      }
    }, [buscar, estado])

  const cargarCatalogos =
    useCallback(async () => {
      const respuesta =
        await obtenerCatalogosReceta()

      setProductosPresentaciones(
        respuesta.productos_presentaciones ??
          []
      )

      setMateriasPrimas(
        respuesta.materias_primas ?? []
      )
    }, [])

  useEffect(() => {
    const temporizador =
      setTimeout(() => {
        cargarRecetas()
      }, 300)

    return () =>
      clearTimeout(temporizador)
  }, [cargarRecetas])

  const abrirNuevaReceta = async () => {
  try {
    setCargandoCatalogos(true)
    setError('')
    setMensaje('')
    setRecetaSeleccionada(null)

    await cargarCatalogos()

    setModalAbierto(true)
  } catch (errorPeticion) {
    setError(
      errorPeticion.message ||
        'No se pudieron cargar los datos para crear la receta.'
    )
  } finally {
    setCargandoCatalogos(false)
  }
}
const abrirEditarReceta = async (
  receta
) => {
  try {
    setCargandoCatalogos(true)
    setError('')
    setMensaje('')

    await cargarCatalogos()

    setRecetaSeleccionada(
      receta
    )

    setModalAbierto(true)
  } catch (errorPeticion) {
    setError(
      errorPeticion.message ||
        'No se pudieron cargar los datos para editar la receta.'
    )
  } finally {
    setCargandoCatalogos(false)
  }
}

const cerrarModal = () => {
  setModalAbierto(false)
  setRecetaSeleccionada(null)
}

const manejarGuardado = async (
  mensajeRespuesta
) => {
  setMensaje(mensajeRespuesta)

  await cargarRecetas()

  try {
    await cargarCatalogos()
  } catch {
    // La operación principal ya fue realizada.
  }
}

const cambiarEstado = async (receta) => {
  try {
    setError('')
    setMensaje('')

    const nuevoEstado = !receta.estado

    await cambiarEstadoReceta(
      receta.id_receta,
      nuevoEstado
    )

    setMensaje(
      nuevoEstado
        ? 'Receta activada correctamente.'
        : 'Receta desactivada correctamente.'
    )

    await cargarRecetas()
  } catch (errorPeticion) {
    console.error(
      'Error al cambiar estado:',
      errorPeticion
    )

    setError(
      errorPeticion.message ||
        'No se pudo cambiar el estado de la receta.'
    )
  }
}

return (
  <section className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Gestión de Recetas
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Administra las recetas y sus materias primas por producto y
          presentación.
        </p>
      </div>

      <button
        type="button"
        onClick={abrirNuevaReceta}
        disabled={cargandoCatalogos}
        className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargandoCatalogos
          ? 'Cargando...'
          : 'Nueva Receta'}
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
          htmlFor="buscar_receta"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Buscar producto
        </label>

        <input
          id="buscar_receta"
          type="text"
          value={buscar}
          onChange={(event) =>
            setBuscar(event.target.value)
          }
          placeholder="Ej. Torta Negra"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
        />
      </div>

      <div>
        <label
          htmlFor="estado_receta"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Estado
        </label>

        <select
          id="estado_receta"
          value={estado}
          onChange={(event) =>
            setEstado(event.target.value)
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
          Cargando recetas...
        </div>
      ) : recetas.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No existen recetas registradas.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  Producto
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  Presentación
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  Ingredientes
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
              {recetas.map((receta) => (
                <tr
                  key={receta.id_receta}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {
                      receta
                        .producto_presentacion
                        ?.producto
                        ?.nombre
                    }
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {
                      receta
                        .producto_presentacion
                        ?.presentacion
                        ?.nombre
                    }
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="space-y-1">
                      {receta.detalles?.map(
                        (detalle) => (
                          <div
                            key={
                              detalle.id_detalle_receta
                            }
                          >
                            {
                              detalle
                                .materia_prima
                                ?.nombre
                            }
                            {' — '}
                            {
                              detalle.cantidad
                            }{' '}
                            {
                              detalle
                                .materia_prima
                                ?.unidad_medida
                            }
                          </div>
                        )
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {receta.estado ? (
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
        abrirEditarReceta(receta)
      }
      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
    >
      Editar
    </button>

    <button
      type="button"
      onClick={() =>
        cambiarEstado(receta)
      }
      className={
        receta.estado
          ? 'rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50'
          : 'rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-600 hover:bg-green-50'
      }
    >
      {receta.estado
        ? 'Desactivar'
        : 'Activar'}
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <RecetaModal
      abierto={modalAbierto}
      onCerrar={cerrarModal}
      onGuardado={manejarGuardado}
      productosPresentaciones={
        productosPresentaciones
      }
      materiasPrimas={
        materiasPrimas
      }
      receta={recetaSeleccionada}
    />
  </section>
)
}

export default RecetasPage
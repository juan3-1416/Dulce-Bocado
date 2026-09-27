import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  crearAlmacen,
  listarAlmacenes,
} from '../../services/inventarioService'

export default function AlmacenList() {
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarAlmacenes()
  }, [])

  const cargarAlmacenes = async () => {
    try {
      setCargando(true)
      setError(null)

      const data = await listarAlmacenes()

      setAlmacenes(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar los almacenes.'
      )
    } finally {
      setCargando(false)
    }
  }

  const abrirModal = () => {
    setNombre('')
    setDescripcion('')
    setError(null)
    setMensaje('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (guardando) {
      return
    }

    setModalAbierto(false)
    setNombre('')
    setDescripcion('')
    setError(null)
  }

  const manejarSubmit = async (evento) => {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()

    if (!nombreLimpio) {
      setError(
        'El nombre del almacén es obligatorio.'
      )
      return
    }

    try {
      setGuardando(true)
      setError(null)
      setMensaje('')

      const respuesta = await crearAlmacen({
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
      })

      setModalAbierto(false)
      setNombre('')
      setDescripcion('')

      setMensaje(
        respuesta?.message ||
          'Almacén creado correctamente.'
      )

      await cargarAlmacenes()
    } catch (err) {
      const errores = err?.data?.errors

      if (errores) {
        const primerError =
          Object.values(errores)[0]

        if (
          Array.isArray(primerError) &&
          primerError.length > 0
        ) {
          setError(primerError[0])
          return
        }
      }

      setError(
        err.message ||
          'No se pudo crear el almacén.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Almacenes
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Administra los almacenes y consulta sus existencias.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
          >
            + Nuevo almacén
          </button>
        </div>

        {mensaje && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {mensaje}
            </p>
          </div>
        )}

        {error && !modalAbierto && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-pink-600" />
          </div>
        ) : almacenes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              No existen almacenes registrados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {almacenes.map((almacen) => (
              <div
                key={almacen.id_almacen}
                className="flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pink-50">
                        <svg
                          className="h-6 w-6 text-pink-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
                          />
                        </svg>
                      </span>
                    </div>

                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {almacen.nombre}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Almacén #{almacen.id_almacen}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      {almacen.descripcion ||
                        'Sin descripción'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
                  <Link
                    to={`/almacenes/${almacen.id_almacen}/existencias`}
                    className="text-sm font-medium text-pink-700 hover:text-pink-900"
                  >
                    Ver existencias →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Inventario
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Nuevo almacén
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={manejarSubmit}>
              <div className="space-y-5 p-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="nombreAlmacen"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nombre
                    <span className="text-red-500">
                      {' '}*
                    </span>
                  </label>

                  <input
                    id="nombreAlmacen"
                    type="text"
                    value={nombre}
                    onChange={(evento) =>
                      setNombre(evento.target.value)
                    }
                    maxLength="100"
                    required
                    autoFocus
                    placeholder="Ej. Cámara Fría"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="descripcionAlmacen"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="descripcionAlmacen"
                    rows="4"
                    value={descripcion}
                    onChange={(evento) =>
                      setDescripcion(evento.target.value)
                    }
                    maxLength="500"
                    placeholder="Describe el uso de este almacén..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400">
                    {descripcion.length}/500
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    !nombre.trim()
                  }
                  className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? 'Creando...'
                    : 'Crear almacén'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
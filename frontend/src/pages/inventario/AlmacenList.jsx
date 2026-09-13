import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarAlmacenes } from '../../services/inventarioService'

export default function AlmacenList() {
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarAlmacenes()
  }, [])

  const cargarAlmacenes = async () => {
    try {
      setCargando(true)
      const data = await listarAlmacenes()
      setAlmacenes(data)
    } catch (err) {
      setError(err.message || 'Error al cargar los almacenes.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Almacenes
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {almacenes.map((almacen) => (
            <div
              key={almacen.id_almacen}
              className="overflow-hidden rounded-lg bg-white shadow flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pink-50">
                      <svg className="h-6 w-6 text-pink-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                      </svg>
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {almacen.nombre}
                    </h3>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    {almacen.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3">
                <Link
                  to={`/almacenes/${almacen.id_almacen}/existencias`}
                  className="text-sm font-medium text-pink-700 hover:text-pink-900"
                >
                  Ver Existencias <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

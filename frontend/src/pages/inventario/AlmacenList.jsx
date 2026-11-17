import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { listarAlmacenes } from '../../services/inventarioConsultaService'

const ETIQUETAS = {
  MATERIAS_PRIMAS: 'Materias primas',
  PRODUCCION: 'Producción',
  MOSTRADOR: 'Mostrador',
}

export default function AlmacenList() {
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (signal) => {
    try {
      const resultado = await listarAlmacenes({ signal })
      if (!signal?.aborted) {
        setAlmacenes(resultado)
        setError('')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'No se pudieron cargar los almacenes.')
      }
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void cargar(controller.signal)
    return () => controller.abort()
  }, [cargar])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Almacenes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta las existencias de materias primas, producción y mostrador.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              setCargando(true)
              setError('')
              void cargar()
            }}
            className="mt-2 text-sm font-semibold text-red-700 underline"
          >
            Reintentar almacenes
          </button>
        </div>
      )}

      {cargando ? (
        <div role="status" className="flex items-center justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-pink-600" />
          <span className="sr-only">Cargando almacenes</span>
        </div>
      ) : error ? null : almacenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No existen almacenes registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {almacenes.map((almacen) => (
            <article
              key={almacen.id_almacen}
              className="flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pink-50 text-pink-700" aria-hidden="true">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7.5 9 4.5 9-4.5M12 12v9" />
                    </svg>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${almacen.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {almacen.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-medium text-gray-900">{almacen.nombre}</h2>
                <p className="mt-1 text-sm text-gray-500">{ETIQUETAS[almacen.tipo] || almacen.tipo}</p>
                <p className="mt-2 text-xs text-gray-400">Almacén #{almacen.id_almacen}</p>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
                <Link
                  to={`/almacenes/${almacen.id_almacen}/existencias`}
                  className="text-sm font-medium text-pink-700 hover:text-pink-900"
                >
                  Ver existencias →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

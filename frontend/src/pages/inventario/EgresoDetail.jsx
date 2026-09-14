import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerEgreso } from '../../services/egresoService'

export default function EgresoDetail() {
  const { id } = useParams()
  const [egreso, setEgreso] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDetalle()
  }, [id])

  const cargarDetalle = async () => {
    try {
      setCargando(true)
      const data = await obtenerEgreso(id)
      setEgreso(data)
    } catch (err) {
      setError(err.message || 'Error al cargar el detalle del egreso.')
    } finally {
      setCargando(false)
    }
  }

  const renderItemNombre = (detalle) => {
    if (detalle.producto_presentacion) {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {detalle.producto_presentacion.producto?.nombre}
          </div>
          <div className="text-gray-500 text-xs">
            {detalle.producto_presentacion.presentacion?.nombre || detalle.producto_presentacion.nombre}
          </div>
        </div>
      )
    }
    if (detalle.materia_prima) {
      return (
        <div className="font-medium text-gray-900">
          {detalle.materia_prima.nombre}
        </div>
      )
    }
    return 'Desconocido'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Detalle de Egreso #{id}
          </h1>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            to="/inventario/egresos"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            &larr; Volver a la lista
          </Link>
        </div>
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
      ) : egreso ? (
        <>
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Información del Egreso
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Fecha y Hora</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {new Date(egreso.fecha_egreso).toLocaleString('es-ES')}
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Registrado Por</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {egreso.usuario?.nombre || 'Sistema'}
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Glosa / Motivo</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {egreso.glosa}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Ítems Descontados
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Almacén Origen
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Ítem
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Tipo
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                      Cantidad Egresada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {egreso.detalles.map((detalle) => (
                    <tr key={detalle.id_detalle_egreso}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {detalle.almacen?.nombre}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {renderItemNombre(detalle)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {detalle.producto_presentacion ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Producto
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Materia Prima
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-semibold text-red-600 sm:pr-6">
                        - {Number(detalle.cantidad).toLocaleString('es-ES', { maximumFractionDigits: 3 })}
                        <span className="text-gray-500 font-normal ml-1">
                          {detalle.producto_presentacion ? 'u.' : (detalle.materia_prima?.unidad_medida || '')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

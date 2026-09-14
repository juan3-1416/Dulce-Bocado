import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarEgresos } from '../../services/egresoService'

export default function EgresoList() {
  const [egresos, setEgresos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarEgresos()
  }, [])

  const cargarEgresos = async () => {
    try {
      setCargando(true)
      const data = await listarEgresos()
      setEgresos(data)
    } catch (err) {
      setError(err.message || 'Error al cargar los egresos de inventario.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Egresos de Inventario
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial y registro de salidas de almacén (mermas, pérdidas, consumos y desincorporación).
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            to="/inventario/egresos/crear"
            className="inline-flex items-center rounded-md bg-pink-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
          >
            Registrar Egreso
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
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Fecha y Hora
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Glosa / Motivo
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Registrado Por
                </th>
                <th
                  scope="col"
                  className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right"
                >
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {egresos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    No hay egresos de inventario registrados.
                  </td>
                </tr>
              ) : (
                egresos.map((egreso) => (
                  <tr key={egreso.id_egreso}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      #{egreso.id_egreso}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(egreso.fecha_egreso).toLocaleString('es-ES')}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {egreso.glosa}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {egreso.usuario?.nombre || 'Sistema'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link
                        to={`/inventario/egresos/${egreso.id_egreso}`}
                        className="text-pink-600 hover:text-pink-900 font-semibold"
                      >
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerAlmacen, listarExistenciasPorAlmacen } from '../../services/inventarioService'

export default function ExistenciaList() {
  const { id } = useParams()
  const [almacen, setAlmacen] = useState(null)
  const [existencias, setExistencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      const [almacenData, existenciasData] = await Promise.all([
        obtenerAlmacen(id),
        listarExistenciasPorAlmacen(id)
      ])
      setAlmacen(almacenData)
      setExistencias(existenciasData)
    } catch (err) {
      setError(err.message || 'Error al cargar las existencias.')
    } finally {
      setCargando(false)
    }
  }

  const renderItemNombre = (existencia) => {
    if (existencia.producto_presentacion) {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {existencia.producto_presentacion.producto?.nombre}
          </div>
          <div className="text-gray-500">
            {existencia.producto_presentacion.nombre}
          </div>
        </div>
      )
    }
    if (existencia.materia_prima) {
      return (
        <div className="font-medium text-gray-900">
          {existencia.materia_prima.nombre}
        </div>
      )
    }
    return 'Desconocido'
  }

  const renderTipo = (existencia) => {
    if (existencia.producto_presentacion) {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          Producto Terminado
        </span>
      )
    }
    if (existencia.materia_prima) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          Materia Prima
        </span>
      )
    }
    return '-'
  }

  const renderUnidad = (existencia) => {
    if (existencia.producto_presentacion) {
      return 'unidades'
    }
    if (existencia.materia_prima) {
      return existencia.materia_prima.unidad_medida || 'g'
    }
    return ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Existencias en {almacen ? almacen.nombre : 'Almacén'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {almacen?.descripcion}
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            to="/almacenes"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            &larr; Volver a Almacenes
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                  Ítem
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                >
                  Cantidad Disponible
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6"
                >
                  Última Actualización
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {existencias.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    No hay existencias registradas en este almacén.
                  </td>
                </tr>
              ) : (
                existencias.map((existencia) => (
                  <tr key={existencia.id_inventario}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      {renderItemNombre(existencia)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {renderTipo(existencia)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-gray-900">
                      {Number(existencia.cantidad).toLocaleString('es-ES', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })} <span className="text-gray-500 font-normal">{renderUnidad(existencia)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right sm:pr-6">
                      {new Date(existencia.ultima_actualizacion).toLocaleString('es-ES')}
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearEgreso } from '../../services/egresoService'
import { listarAlmacenes } from '../../services/inventarioService'
import { listarMateriasPrimas } from '../../services/materiaPrimaService'
import { listarProductos } from '../../services/productoService'

export default function EgresoForm() {
  const navigate = useNavigate()

  const [almacenes, setAlmacenes] = useState([])
  const [materiasPrimas, setMateriasPrimas] = useState([])
  const [presentacionesPlanificadas, setPresentacionesPlanificadas] = useState([])

  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const [glosa, setGlosa] = useState('')
  const [detalles, setDetalles] = useState([
    { tipo: 'materia_prima', id_almacen: '', id_item: '', cantidad: 1 }
  ])

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true)
      const [almacenesRes, materiasRes, productosRes] = await Promise.all([
        listarAlmacenes(),
        listarMateriasPrimas({ estado: '1' }),
        listarProductos({ estado: '1' })
      ])

      setAlmacenes(almacenesRes || [])
      setMateriasPrimas(materiasRes.materias_primas || [])

      // Aplanar presentaciones de productos
      const presentaciones = []
      ;(productosRes.productos || []).forEach(producto => {
        if (producto.presentaciones) {
          producto.presentaciones.forEach(pres => {
            presentaciones.push({
              id_producto_presentacion: pres.pivot?.id_producto_presentacion || pres.id_presentacion,
              nombre_producto: producto.nombre,
              nombre_presentacion: pres.nombre
            })
          })
        }
      })
      setPresentacionesPlanificadas(presentaciones)
    } catch (err) {
      setError(err.message || 'Error al cargar catálogos para egreso.')
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      { tipo: 'materia_prima', id_almacen: '', id_item: '', cantidad: 1 }
    ])
  }

  const eliminarDetalle = (index) => {
    if (detalles.length === 1) return
    const nuevosDetalles = [...detalles]
    nuevosDetalles.splice(index, 1)
    setDetalles(nuevosDetalles)
  }

  const actualizarDetalle = (index, campo, valor) => {
    const nuevosDetalles = [...detalles]
    nuevosDetalles[index][campo] = valor
    if (campo === 'tipo') {
      nuevosDetalles[index].id_item = ''
    }
    setDetalles(nuevosDetalles)
  }

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!glosa.trim()) {
      setError('La glosa o motivo del egreso es obligatoria.')
      return
    }

    const payloadDetalles = []
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i]
      if (!d.id_almacen) {
        setError(`Seleccione un almacén de origen para el ítem #${i + 1}`)
        return
      }
      if (!d.id_item) {
        setError(`Seleccione un producto o materia prima para el ítem #${i + 1}`)
        return
      }
      if (Number(d.cantidad) <= 0) {
        setError(`La cantidad debe ser mayor a 0 en el ítem #${i + 1}`)
        return
      }

      payloadDetalles.push({
        id_almacen: Number(d.id_almacen),
        cantidad: Number(d.cantidad),
        id_materia_prima: d.tipo === 'materia_prima' ? Number(d.id_item) : null,
        id_producto_presentacion: d.tipo === 'producto' ? Number(d.id_item) : null
      })
    }

    try {
      setGuardando(true)
      await crearEgreso({
        glosa: glosa.trim(),
        detalles: payloadDetalles
      })
      navigate('/inventario/egresos')
    } catch (err) {
      setError(err.message || 'Error al registrar el egreso de inventario.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Registrar Egreso de Inventario
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Registra mermas, vencimientos, daños o salidas directas de materias primas o productos.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {cargandoCatalogos ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <form onSubmit={manejarSubmit} className="space-y-8 divide-y divide-gray-200">
          <div className="bg-white shadow sm:rounded-lg p-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Datos del Registro</h3>
              <p className="mt-1 text-sm text-gray-500">
                Información general y motivo del egreso.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="glosa" className="block text-sm font-medium text-gray-700">
                  Glosa / Motivo de Salida *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="glosa"
                    id="glosa"
                    required
                    value={glosa}
                    onChange={(e) => setGlosa(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border"
                    placeholder="Ej. Merma por vencimiento de materias primas o rotura de envase"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg p-6 pt-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Detalles del Egreso</h3>
              <p className="mt-1 text-sm text-gray-500">
                Selecciona el almacén de origen, el ítem y la cantidad a descontar.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {detalles.map((detalle, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-end gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="w-full sm:w-1/4">
                    <label className="block text-sm font-medium text-gray-700">Tipo de Ítem</label>
                    <select
                      value={detalle.tipo}
                      onChange={(e) => actualizarDetalle(index, 'tipo', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm border"
                    >
                      <option value="materia_prima">Materia Prima</option>
                      <option value="producto">Producto / Presentación</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Ítem *</label>
                    <select
                      value={detalle.id_item}
                      onChange={(e) => actualizarDetalle(index, 'id_item', e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm border"
                    >
                      <option value="">Seleccionar...</option>
                      {detalle.tipo === 'materia_prima' ? (
                        materiasPrimas.map(mp => (
                          <option key={mp.id_materia_prima} value={mp.id_materia_prima}>
                            {mp.nombre} ({mp.unidad_medida})
                          </option>
                        ))
                      ) : (
                        presentacionesPlanificadas.map(pp => (
                          <option key={pp.id_producto_presentacion} value={pp.id_producto_presentacion}>
                            {pp.nombre_producto} - {pp.nombre_presentacion}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <label className="block text-sm font-medium text-gray-700">Almacén Origen *</label>
                    <select
                      value={detalle.id_almacen}
                      onChange={(e) => actualizarDetalle(index, 'id_almacen', e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-pink-500 focus:outline-none focus:ring-pink-500 sm:text-sm border"
                    >
                      <option value="">Seleccionar...</option>
                      {almacenes.map(a => (
                        <option key={a.id_almacen} value={a.id_almacen}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-1/6">
                    <label className="block text-sm font-medium text-gray-700">Cantidad *</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      value={detalle.cantidad}
                      onChange={(e) => actualizarDetalle(index, 'cantidad', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border"
                    />
                  </div>

                  <div className="w-full sm:w-auto pb-1">
                    <button
                      type="button"
                      onClick={() => eliminarDetalle(index)}
                      disabled={detalles.length === 1}
                      className="inline-flex items-center rounded-md bg-white p-2 text-red-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 border border-gray-300"
                      title="Eliminar este ítem"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={agregarDetalle}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar otro ítem
              </button>
            </div>
          </div>

          <div className="pt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/inventario/egresos')}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex justify-center rounded-md border border-transparent bg-pink-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {guardando ? 'Guardando Egreso...' : 'Guardar Egreso'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

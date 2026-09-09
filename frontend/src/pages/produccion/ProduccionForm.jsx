import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarProductos } from '../../services/productoService'
import { listarPresentaciones } from '../../services/presentacionService'
import { crearProduccion } from '../../services/produccionService'

function ProduccionForm() {
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [presentaciones, setPresentaciones] = useState([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [formulario, setFormulario] = useState({
    id_producto_presentacion: '',
    cantidad: 1,
    observaciones: '',
  })

  const [recetaActual, setRecetaActual] = useState(null)

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        setCargandoCatalogos(true)
        const [productosResp, presentacionesResp] = await Promise.all([
          listarProductos({ estado: true }),
          listarPresentaciones({ estado: true }),
        ])

        setProductos(productosResp.productos ?? [])
        setPresentaciones(presentacionesResp.presentaciones ?? [])
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los catálogos.')
      } finally {
        setCargandoCatalogos(false)
      }
    }

    cargarCatalogos()
  }, [])

  const presentacionSeleccionada = useMemo(() => {
    if (!formulario.id_producto_presentacion) return null

    return presentaciones.find(
      (item) => Number(item.id_producto_presentacion) === Number(formulario.id_producto_presentacion)
    )
  }, [formulario.id_producto_presentacion, presentaciones])

  useEffect(() => {
    const cargarReceta = async () => {
      if (!formulario.id_producto_presentacion) {
        setRecetaActual(null)
        return
      }

      try {
        setError('')

        const receta = presentacionSeleccionada?.receta ?? null

        if (!receta) {
          setRecetaActual(null)
          return
        }

        setRecetaActual(receta)
      } catch (err) {
        setError(err.message || 'No se pudo cargar la receta de la presentación.')
      }
    }

    cargarReceta()
  }, [formulario.id_producto_presentacion, presentacionSeleccionada])

  const insumos = useMemo(() => {
    const receta = recetaActual
    if (!receta || !Array.isArray(receta.detalles)) return []

    const cantidad = Number(formulario.cantidad || 0)

    return receta.detalles.map((detalle) => {
      const requerido = Number(detalle.cantidad || 0) * cantidad
      const stockActual = Number(detalle.materia_prima?.stock_actual ?? detalle.stock_actual ?? 0)
      const faltante = stockActual < requerido

      return {
        ...detalle,
        requerido,
        stock_actual: stockActual,
        estado: faltante ? '❌ Faltante' : '✅',
        faltante,
      }
    })
  }, [formulario.cantidad, recetaActual])

  const hayReceta = Boolean(recetaActual)
  const hayStockInsuficiente = insumos.some((insumo) => insumo.faltante)
  const esValido = Boolean(formulario.id_producto_presentacion) && Number(formulario.cantidad) >= 1 && hayReceta && !hayStockInsuficiente

  const manejarCambio = (evento) => {
    const { name, value } = evento.target

    setFormulario((prev) => ({
      ...prev,
      [name]: name === 'cantidad' ? Number(value) || 0 : value,
    }))
  }

  const manejarSubmit = async (evento) => {
    evento.preventDefault()

    if (!esValido) {
      setError('Debe completar la información correctamente antes de crear la orden.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      await crearProduccion({
        id_producto_presentacion: Number(formulario.id_producto_presentacion),
        cantidad: Number(formulario.cantidad),
        observaciones: formulario.observaciones.trim() || null,
      })

      navigate('/produccion')
    } catch (err) {
      setError(err.message || 'No se pudo crear la orden de producción.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Producción</h1>
          <p className="mt-1 text-sm text-gray-600">Crea una orden de producción validando receta y stock.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/produccion')}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Volver a lista
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={manejarSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Presentación</label>
            <select
              name="id_producto_presentacion"
              value={formulario.id_producto_presentacion}
              onChange={manejarCambio}
              disabled={cargandoCatalogos}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:bg-slate-100"
            >
              <option value="">Seleccione una presentación</option>
              {presentaciones.map((presentacion) => (
                <option key={presentacion.id_producto_presentacion} value={presentacion.id_producto_presentacion}>
                  {presentacion.producto?.nombre || 'Producto'} / {presentacion.presentacion?.nombre || 'Presentación'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              name="cantidad"
              min="1"
              value={formulario.cantidad}
              onChange={manejarCambio}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
          <textarea
            name="observaciones"
            rows="3"
            value={formulario.observaciones}
            onChange={manejarCambio}
            placeholder="Observaciones opcionales de la orden..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        {!formulario.id_producto_presentacion ? null : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {!hayReceta ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                La presentación seleccionada no tiene una receta asociada.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Vista previa de insumos</p>
                  {hayStockInsuficiente && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Stock insuficiente
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Materia Prima</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Requerido</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Stock actual</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {insumos.map((insumo) => (
                        <tr key={insumo.id_detalle_receta ?? `${insumo.id_materia_prima}-${insumo.requerido}`} className={insumo.faltante ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {insumo.materia_prima?.nombre || 'Materia prima'}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-slate-700">
                            {insumo.requerido} {insumo.materia_prima?.unidad_medida || ''}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-slate-700">
                            {insumo.stock_actual} {insumo.materia_prima?.unidad_medida || ''}
                          </td>
                          <td className="px-3 py-2 text-center text-sm font-semibold">
                            <span className={insumo.faltante ? 'text-red-700' : 'text-green-700'}>
                              {insumo.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => navigate('/produccion')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando || !esValido}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Creando orden...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProduccionForm

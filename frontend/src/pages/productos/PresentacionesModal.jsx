import { useCallback, useEffect, useState } from 'react'
import { actualizarPresentacion, crearPresentacion, listarPresentaciones } from '../../services/presentacionService'

const vacio = { nombre: '', precio: '', disponible: true, permite_personalizacion: false }

function PresentacionesModal({ isOpen, onClose, producto, puedeGestionar = false }) {
  const [presentaciones, setPresentaciones] = useState([])
  const [formulario, setFormulario] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(async () => {
    if (!producto) return
    try {
      setCargando(true)
      setError('')
      const respuesta = await listarPresentaciones({ id_producto: producto.id_producto })
      setPresentaciones(respuesta.presentaciones ?? [])
    } catch (err) {
      setPresentaciones([])
      setError(err.message || 'No se pudieron cargar las presentaciones.')
    } finally {
      setCargando(false)
    }
  }, [producto])

  useEffect(() => {
    if (!isOpen) return
    setFormulario(vacio)
    setEditandoId(null)
    setMensaje('')
    cargar()
  }, [isOpen, cargar])

  if (!isOpen || !producto) return null

  const editar = (presentacion) => {
    setEditandoId(presentacion.presentacion_id)
    setFormulario({
      nombre: presentacion.nombre,
      precio: String(presentacion.precio),
      disponible: Boolean(presentacion.disponible),
      permite_personalizacion: Boolean(presentacion.permite_personalizacion),
    })
    setError('')
  }

  const guardar = async (event) => {
    event.preventDefault()
    const precio = Number(formulario.precio)
    if (!Number.isFinite(precio) || precio < 0) {
      setError('El precio debe ser un número mayor o igual a cero.')
      return
    }
    try {
      setGuardando(true)
      setError('')
      const datos = {
        id_producto: producto.id_producto,
        nombre: formulario.nombre.trim(),
        precio: precio.toFixed(2),
        moneda: 'BOB',
        disponible: formulario.disponible,
        permite_personalizacion: formulario.permite_personalizacion,
      }
      if (editandoId) await actualizarPresentacion(editandoId, datos)
      else await crearPresentacion(datos)
      setMensaje(editandoId ? 'Presentación actualizada.' : 'Presentación creada.')
      setEditandoId(null)
      setFormulario(vacio)
      await cargar()
    } catch (err) {
      const primerError = Object.values(err.data?.errors ?? {})[0]
      setError((Array.isArray(primerError) ? primerError[0] : null) || err.message || 'No se pudo guardar la presentación.')
    } finally {
      setGuardando(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div><h2 className="text-xl font-bold text-gray-900">Presentaciones y precios</h2><p className="text-sm text-gray-500">Producto: {producto.nombre}</p></div>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Cerrar">✕</button>
      </div>
      <div className="space-y-5 overflow-y-auto p-6">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {mensaje && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{mensaje}</p>}
        {puedeGestionar && <form onSubmit={guardar} className="space-y-4 rounded-lg bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-800">{editandoId ? 'Editar presentación' : 'Nueva presentación'}</h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <label className="text-sm font-medium text-gray-700">Nombre
              <input required maxLength={200} value={formulario.nombre} onChange={(event) => setFormulario((actual) => ({ ...actual, nombre: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Precio Bs
              <input type="number" required min="0" step="0.01" value={formulario.precio} onChange={(event) => setFormulario((actual) => ({ ...actual, precio: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formulario.disponible} onChange={(event) => setFormulario((actual) => ({ ...actual, disponible: event.target.checked }))} />Disponible para venta</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formulario.permite_personalizacion} onChange={(event) => setFormulario((actual) => ({ ...actual, permite_personalizacion: event.target.checked }))} />Permite personalización</label>
          </div>
          <div className="flex gap-2">
            {editandoId && <button type="button" onClick={() => { setEditandoId(null); setFormulario(vacio) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancelar edición</button>}
            <button type="submit" disabled={guardando} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {cargando ? <p className="p-6 text-sm text-gray-500">Cargando presentaciones...</p> : <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Presentación</th><th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Precio</th><th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Disponibilidad</th><th className="px-4 py-3 text-right text-xs uppercase text-gray-600">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{presentaciones.map((item) => <tr key={item.presentacion_id}>
              <td className="px-4 py-3 text-sm font-medium">{item.nombre}</td><td className="px-4 py-3 text-sm">Bs {Number(item.precio).toFixed(2)}</td><td className="px-4 py-3 text-sm">{item.disponible ? 'Disponible' : 'No disponible'}</td>
              <td className="px-4 py-3 text-right">{puedeGestionar && <button type="button" onClick={() => editar(item)} className="text-sm font-semibold text-pink-600 hover:text-pink-800">Editar</button>}</td>
            </tr>)}{presentaciones.length === 0 && <tr><td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">No hay presentaciones registradas.</td></tr>}</tbody>
          </table>}
        </div>
      </div>
    </div>
  </div>
}

export default PresentacionesModal

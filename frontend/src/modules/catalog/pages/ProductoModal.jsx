import { useEffect, useState } from 'react'
import { crearProducto, actualizarProducto } from '../../services/catalogoProductoService'
import { crearCategoria } from '../../services/categoriaService'

const vacio = { nombre: '', descripcion: '', id_categoria: '', estado: true }

function ProductoModal({ isOpen, onClose, productoEditando, categorias = [], onSaved, onCategoriaCreada }) {
  const [formulario, setFormulario] = useState(vacio)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [categoriaNuevaAbierta, setCategoriaNuevaAbierta] = useState(false)
  const [categoriaCreada, setCategoriaCreada] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setFormulario(productoEditando ? {
      nombre: productoEditando.nombre,
      descripcion: productoEditando.descripcion ?? '',
      id_categoria: String(productoEditando.id_categoria),
      estado: Boolean(productoEditando.estado),
    } : vacio)
    setCategoriaNuevaAbierta(false)
    setCategoriaCreada(null)
    setNuevaCategoria('')
    setError('')
  }, [isOpen, productoEditando])

  if (!isOpen) return null

  const guardarCategoria = async () => {
    if (!nuevaCategoria.trim()) return
    try {
      setGuardando(true)
      const respuesta = await crearCategoria({ nombre: nuevaCategoria.trim(), estado: true })
      setCategoriaCreada(respuesta.categoria)
      setFormulario((actual) => ({ ...actual, id_categoria: String(respuesta.categoria.id_categoria) }))
      setCategoriaNuevaAbierta(false)
      onCategoriaCreada?.()
    } catch (err) {
      setError(err.message || 'No se pudo crear la categoría.')
    } finally {
      setGuardando(false)
    }
  }

  const guardar = async (event) => {
    event.preventDefault()
    try {
      setGuardando(true)
      setError('')
      const datos = {
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim() || null,
        id_categoria: Number(formulario.id_categoria),
        estado: formulario.estado,
      }
      if (productoEditando) await actualizarProducto(productoEditando.id_producto, datos)
      else await crearProducto(datos)
      onSaved()
    } catch (err) {
      const primerError = Object.values(err.data?.errors ?? {})[0]
      setError((Array.isArray(primerError) ? primerError[0] : null) || err.message || 'No se pudo guardar el producto.')
    } finally {
      setGuardando(false)
    }
  }

  const categoriasDisponibles = categoriaCreada && !categorias.some((item) => item.id_categoria === categoriaCreada.id_categoria)
    ? [...categorias, categoriaCreada]
    : categorias

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        <button type="button" onClick={onClose} disabled={guardando} className="text-gray-500 hover:text-gray-700" aria-label="Cerrar">✕</button>
      </div>
      <form onSubmit={guardar} className="space-y-5 p-6">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="block text-sm font-medium text-gray-700">Nombre del producto
          <input required maxLength={150} value={formulario.nombre} onChange={(event) => setFormulario((actual) => ({ ...actual, nombre: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="categoria-producto" className="text-sm font-medium text-gray-700">Categoría</label>
            <button type="button" onClick={() => setCategoriaNuevaAbierta((actual) => !actual)} className="text-xs font-semibold text-pink-600">+ Nueva categoría</button>
          </div>
          {categoriaNuevaAbierta && <div className="mb-3 flex gap-2 rounded-lg border border-pink-200 bg-pink-50 p-3">
            <input value={nuevaCategoria} onChange={(event) => setNuevaCategoria(event.target.value)} maxLength={100} placeholder="Nombre de la categoría" className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button type="button" onClick={guardarCategoria} disabled={guardando} className="rounded-md bg-pink-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Crear</button>
          </div>}
          <select id="categoria-producto" required value={formulario.id_categoria} onChange={(event) => setFormulario((actual) => ({ ...actual, id_categoria: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Seleccione una categoría</option>
            {categoriasDisponibles.filter((item) => item.estado || String(item.id_categoria) === formulario.id_categoria).map((item) => <option key={item.id_categoria} value={item.id_categoria}>{item.nombre}</option>)}
          </select>
        </div>
        <label className="block text-sm font-medium text-gray-700">Descripción
          <textarea value={formulario.descripcion} onChange={(event) => setFormulario((actual) => ({ ...actual, descripcion: event.target.value }))} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formulario.estado} onChange={(event) => setFormulario((actual) => ({ ...actual, estado: event.target.checked }))} />Producto activo</label>
        <p className="text-sm text-gray-500">Las presentaciones y sus precios se gestionan después de guardar el producto.</p>
        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button type="submit" disabled={guardando} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar producto'}</button>
        </div>
      </form>
    </div>
  </div>
}

export default ProductoModal

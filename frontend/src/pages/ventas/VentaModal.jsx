import { useEffect, useMemo, useRef, useState } from 'react'
import { actualizarVenta, crearVenta, generarIdempotencyKey } from '../../services/ventaService'

const filaVacia = () => ({
  uid: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`,
  presentacion_id: '',
  cantidad: '1',
})

function VentaModal({ abierto, onCerrar, onGuardado, clientes, presentaciones, errorClientes = '', venta = null }) {
  const [tipoCliente, setTipoCliente] = useState('registrado')
  const [idCliente, setIdCliente] = useState('')
  const [nombreOcasional, setNombreOcasional] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const intentoGuardar = useRef(null)

  useEffect(() => {
    if (!abierto) return
    intentoGuardar.current = null
    setError('')
    setTipoCliente(venta?.id_cliente ? 'registrado' : venta ? 'ocasional' : 'registrado')
    setIdCliente(venta?.id_cliente ? String(venta.id_cliente) : '')
    setNombreOcasional(venta?.nombre_cliente_ocasional ?? '')
    setObservaciones(venta?.observaciones ?? '')
    setItems(venta?.detalles?.length
      ? venta.detalles.map((detalle) => ({
          uid: `detalle-${detalle.id_detalle_venta}`,
          presentacion_id: String(detalle.presentacion_id),
          cantidad: String(detalle.cantidad),
        }))
      : [filaVacia()])
  }, [abierto, venta])

  const totalEstimado = useMemo(() => items.reduce((total, item) => {
    const presentacion = presentaciones.find(
      (opcion) => Number(opcion.presentacion_id) === Number(item.presentacion_id),
    )
    return total + Number(presentacion?.precio ?? 0) * Number(item.cantidad || 0)
  }, 0), [items, presentaciones])

  if (!abierto) return null

  const cambiarItem = (uid, campo, valor) => {
    setItems((actuales) => actuales.map((item) => item.uid === uid
      ? { ...item, [campo]: valor }
      : item))
  }

  const guardar = async (event) => {
    event.preventDefault()
    if (guardando) return
    if (tipoCliente === 'registrado' && !idCliente) {
      setError('Selecciona un cliente registrado.')
      return
    }
    if (tipoCliente === 'registrado' && !clientes.some(
      (cliente) => cliente.estado && Number(cliente.id_cliente) === Number(idCliente),
    )) {
      setError('El cliente registrado ya no está disponible. Selecciona otro cliente.')
      return
    }
    if (tipoCliente === 'ocasional' && !nombreOcasional.trim()) {
      setError('Ingresa el nombre del cliente ocasional.')
      return
    }
    const ids = items.map((item) => Number(item.presentacion_id))
    if (items.length === 0 || ids.some((id) => !Number.isInteger(id) || id < 1
      || !presentaciones.some((opcion) => Number(opcion.presentacion_id) === id))
      || new Set(ids).size !== ids.length
      || items.some((item) => !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1)) {
      setError('Selecciona presentaciones disponibles distintas y cantidades enteras mayores que cero.')
      return
    }

    const datos = {
      id_cliente: tipoCliente === 'registrado' ? Number(idCliente) : null,
      nombre_cliente_ocasional: tipoCliente === 'ocasional' ? nombreOcasional.trim() : null,
      observaciones: observaciones.trim() || null,
      items: items.map((item) => ({
        presentacion_id: Number(item.presentacion_id),
        cantidad: Number(item.cantidad),
      })),
    }

    const payload = JSON.stringify(datos)
    if (intentoGuardar.current?.payload !== payload) {
      intentoGuardar.current = { payload, clave: generarIdempotencyKey() }
    }

    try {
      setGuardando(true)
      setError('')
      const respuesta = venta
        ? await actualizarVenta(venta.id_venta, datos, intentoGuardar.current.clave)
        : await crearVenta(datos, intentoGuardar.current.clave)
      await onGuardado(respuesta?.message || (venta
        ? 'Venta actualizada correctamente.'
        : 'Venta registrada correctamente.'))
      intentoGuardar.current = null
      onCerrar()
    } catch (errorPeticion) {
      const primerError = Object.values(errorPeticion.data?.errors ?? {})[0]
      setError((Array.isArray(primerError) ? primerError[0] : null)
        || errorPeticion.message || 'No se pudo guardar la venta.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{venta ? 'Editar Venta' : 'Nueva Venta'}</h2>
            <p className="mt-1 text-sm text-gray-500">Registra presentaciones y cantidades. Sales calcula el precio final.</p>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={guardar} className="space-y-6 p-6">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <fieldset disabled={guardando} className="rounded-xl border border-gray-200 p-4">
            <legend className="px-1 font-semibold text-gray-900">Cliente</legend>
            {errorClientes && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{errorClientes} Puedes registrar un cliente ocasional.</p>}
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="tipo_cliente" checked={tipoCliente === 'registrado'} onChange={() => setTipoCliente('registrado')} />Cliente registrado</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="tipo_cliente" checked={tipoCliente === 'ocasional'} onChange={() => setTipoCliente('ocasional')} />Cliente ocasional</label>
            </div>
            {tipoCliente === 'registrado' ? (
              <label className="block text-sm font-medium text-gray-700">Cliente
                <select value={idCliente} onChange={(event) => setIdCliente(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="">Seleccionar cliente</option>
                  {idCliente && !clientes.some((cliente) => cliente.estado && Number(cliente.id_cliente) === Number(idCliente)) && (
                    <option value={idCliente} disabled>Cliente anterior no disponible — selecciona otro</option>
                  )}
                  {clientes.filter((cliente) => cliente.estado).map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre} {cliente.apellido ?? ''}</option>)}
                </select>
              </label>
            ) : (
              <label className="block text-sm font-medium text-gray-700">Nombre del cliente
                <input value={nombreOcasional} onChange={(event) => setNombreOcasional(event.target.value)} required maxLength={150} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
            )}
          </fieldset>

          <fieldset disabled={guardando} className="space-y-3">
            <legend className="font-semibold text-gray-900">Presentaciones</legend>
            {items.map((item) => (
              <div key={item.uid} className="grid gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-[1fr_110px_auto]">
                <label className="text-sm font-medium text-gray-700">Producto y presentación
                  <select value={item.presentacion_id} onChange={(event) => cambiarItem(item.uid, 'presentacion_id', event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Seleccionar</option>
                    {item.presentacion_id && !presentaciones.some((opcion) => Number(opcion.presentacion_id) === Number(item.presentacion_id)) && (
                      <option value={item.presentacion_id} disabled>Presentación anterior no disponible — selecciona otra</option>
                    )}
                    {presentaciones.map((presentacion) => <option key={presentacion.presentacion_id} value={presentacion.presentacion_id}>{presentacion.etiqueta} — Bs {Number(presentacion.precio).toFixed(2)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Cantidad
                  <input type="number" min="1" max="10000" step="1" value={item.cantidad} onChange={(event) => cambiarItem(item.uid, 'cantidad', event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <button type="button" disabled={items.length === 1} onClick={() => setItems((actuales) => actuales.filter((actual) => actual.uid !== item.uid))} className="self-end rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Quitar</button>
              </div>
            ))}
            <button type="button" disabled={items.length >= 50 || guardando} onClick={() => setItems((actuales) => [...actuales, filaVacia()])} className="rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50">+ Agregar producto</button>
          </fieldset>

          <label className="block text-sm font-medium text-gray-700">Observaciones
            <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} disabled={guardando} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">Estimado: <strong>Bs {totalEstimado.toFixed(2)}</strong>. El total definitivo lo calcula Sales.</p>
            <div className="flex gap-2">
              <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancelar</button>
              <button type="submit" disabled={guardando} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">{guardando ? 'Guardando...' : venta ? 'Guardar cambios' : 'Registrar venta'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VentaModal

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
  const dialogoRef = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const manejarTeclado = (event) => {
      if (event.key === 'Escape' && !guardando) onCerrar()
      if (event.key !== 'Tab') return
      const controles = dialogoRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      if (!controles?.length) return
      const primero = controles[0]
      const ultimo = controles[controles.length - 1]
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus() }
      if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', manejarTeclado)
    return () => document.removeEventListener('keydown', manejarTeclado)
  }, [abierto, guardando, onCerrar])

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
        : 'Venta registrada correctamente.'), !venta)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
      <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="venta-modal-titulo" className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle px-5 py-4 sm:px-6">
          <div>
            <h2 id="venta-modal-titulo" className="text-xl font-semibold text-theme-heading">{venta ? 'Editar venta' : 'Nueva venta'}</h2>
            <p className="mt-1 text-sm text-theme-muted">Selecciona presentaciones y cantidades. El total definitivo se calcula al guardar.</p>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50" aria-label="Cerrar formulario de venta"><svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>

        <form onSubmit={guardar} className="space-y-6 p-5 sm:p-6">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <fieldset disabled={guardando} className="rounded-xl border border-theme-border-subtle p-4">
            <legend className="px-1 font-semibold text-theme-heading">Cliente</legend>
            {errorClientes && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{errorClientes} Puedes registrar un cliente ocasional.</p>}
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex min-h-10 items-center gap-2 text-sm text-theme-body"><input type="radio" name="tipo_cliente" checked={tipoCliente === 'registrado'} onChange={() => setTipoCliente('registrado')} className="accent-pink-600" />Cliente registrado</label>
              <label className="flex min-h-10 items-center gap-2 text-sm text-theme-body"><input type="radio" name="tipo_cliente" checked={tipoCliente === 'ocasional'} onChange={() => setTipoCliente('ocasional')} className="accent-pink-600" />Cliente ocasional</label>
            </div>
            {tipoCliente === 'registrado' ? (
              <label className="block text-sm font-medium text-theme-body">Cliente
                <select value={idCliente} onChange={(event) => setIdCliente(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
                  <option value="">Seleccionar cliente</option>
                  {idCliente && !clientes.some((cliente) => cliente.estado && Number(cliente.id_cliente) === Number(idCliente)) && (
                    <option value={idCliente} disabled>Cliente anterior no disponible — selecciona otro</option>
                  )}
                  {clientes.filter((cliente) => cliente.estado).map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre} {cliente.apellido ?? ''}</option>)}
                </select>
              </label>
            ) : (
              <label className="block text-sm font-medium text-theme-body">Nombre del cliente
                <input value={nombreOcasional} onChange={(event) => setNombreOcasional(event.target.value)} required maxLength={150} className="mt-1.5 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600" />
              </label>
            )}
          </fieldset>

          <fieldset disabled={guardando} className="min-w-0 space-y-3">
            <legend className="font-semibold text-theme-heading">Presentaciones</legend>
            {items.map((item) => (
              <div key={item.uid} className="grid min-w-0 gap-4 rounded-xl border border-theme-border-subtle p-4 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                <label className="min-w-0 text-sm font-medium text-theme-body">Producto y presentación
                  <select value={item.presentacion_id} onChange={(event) => cambiarItem(item.uid, 'presentacion_id', event.target.value)} required className="mt-1.5 w-full min-w-0 rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
                    <option value="">Seleccionar</option>
                    {item.presentacion_id && !presentaciones.some((opcion) => Number(opcion.presentacion_id) === Number(item.presentacion_id)) && (
                      <option value={item.presentacion_id} disabled>Presentación anterior no disponible — selecciona otra</option>
                    )}
                    {presentaciones.map((presentacion) => <option key={presentacion.presentacion_id} value={presentacion.presentacion_id}>{presentacion.etiqueta} — Bs {Number(presentacion.precio).toFixed(2)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-theme-body">Cantidad
                  <input type="number" min="1" max="10000" step="1" value={item.cantidad} onChange={(event) => cambiarItem(item.uid, 'cantidad', event.target.value)} required className="mt-1.5 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600" />
                </label>
                <button type="button" disabled={items.length === 1} onClick={() => setItems((actuales) => actuales.filter((actual) => actual.uid !== item.uid))} className="min-h-11 self-end rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40">Quitar</button>
              </div>
            ))}
            <button type="button" disabled={items.length >= 50 || guardando} onClick={() => setItems((actuales) => [...actuales, filaVacia()])} className="min-h-10 rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50">Agregar producto</button>
          </fieldset>

          <label className="block text-sm font-medium text-theme-body">Observaciones
            <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} disabled={guardando} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600" />
          </label>
          <section aria-label="Resumen de la venta" className="rounded-xl border border-theme-border-subtle bg-theme-subtle p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-theme-muted">Total estimado</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-theme-heading">Bs {totalEstimado.toFixed(2)}</p>
              </div>
              {venta && <div className="sm:text-right"><p className="text-sm text-theme-muted">Total guardado</p><p className="mt-1 text-base font-semibold tabular-nums text-theme-heading">Bs {Number(venta.total ?? 0).toFixed(2)}</p></div>}
            </div>
            <p className="mt-4 border-t border-theme-border-subtle pt-3 text-sm text-theme-muted">El total definitivo se calculará al guardar la venta.</p>
          </section>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            La venta se guardará como <strong>borrador</strong>. Las existencias de Mostrador se comprobarán y descontarán cuando confirmes la venta.
          </p>

          <div className="flex flex-wrap justify-end gap-2 border-t border-theme-border-subtle pt-5">
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button type="button" onClick={onCerrar} disabled={guardando} className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={guardando} className="min-h-11 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-theme-brand-text hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50">{guardando ? 'Guardando…' : venta ? 'Guardar cambios' : 'Registrar venta'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VentaModal

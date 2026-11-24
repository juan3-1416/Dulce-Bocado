import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { listarRecetas } from '../../services/catalogoRecetaService'
import { generarClaveProduccion, registrarProduccionGateway } from '../../services/produccionGatewayService'
import { formatearCantidad } from '../../../utils/formatters'

const clavePendiente = (actor) => `sprint3.produccion.pendiente.${actor}`

function leerPendiente(actor) {
  try {
    if (!actor) return null
    const valor = JSON.parse(localStorage.getItem(clavePendiente(actor)) || 'null')
    if (valor?.actor === actor && typeof valor.clave === 'string' &&
        Number.isSafeInteger(valor.datos?.presentacion_id) &&
        Number.isSafeInteger(valor.datos?.cantidad)) return valor
  } catch {
    // Un almacenamiento bloqueado o inválido no impide abrir el formulario.
  }
  return null
}

function guardarPendiente(actor, valor) {
  try {
    if (!actor) return false
    if (valor) localStorage.setItem(clavePendiente(actor), JSON.stringify(valor))
    else localStorage.removeItem(clavePendiente(actor))
    return true
  } catch {
    return false
  }
}

export default function ProduccionForm() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const actor = usuario?.id_usuario
  const inicial = leerPendiente(actor)
  const [pendiente, setPendiente] = useState(inicial)
  const [presentacionId, setPresentacionId] = useState(String(inicial?.datos.presentacion_id || ''))
  const [cantidad, setCantidad] = useState(String(inicial?.datos.cantidad || '1'))
  const [observaciones, setObservaciones] = useState(inicial?.datos.observaciones || '')
  const [recetas, setRecetas] = useState([])
  const [reintentoCatalogo, setReintentoCatalogo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState(inicial ? 'Hay una solicitud anterior sin confirmar. Reinténtala con la misma clave para conocer su resultado.' : '')

  useEffect(() => {
    let activo = true
    listarRecetas({ estado: '1' })
      .then((respuesta) => {
        if (!activo) return
        setRecetas((respuesta.recetas || []).filter((receta) =>
          receta.estado === true && receta.presentacion?.disponible === true &&
          receta.presentacion?.producto?.estado === true &&
          Array.isArray(receta.detalles) && receta.detalles.length > 0))
      })
      .catch((err) => { if (activo) setError(err.message || 'No se pudieron consultar las recetas.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [reintentoCatalogo])

  const receta = recetas.find((item) => item.presentacion_id === Number(presentacionId))
  const datosValidos = /^[1-9]\d*$/.test(presentacionId) && /^[1-9]\d*$/.test(cantidad) &&
    Number.isSafeInteger(Number(presentacionId)) && Number(cantidad) <= 1000000 &&
    observaciones.length <= 2000

  const enviar = async (evento) => {
    evento.preventDefault()
    setError('')
    setMensaje('')
    if (!Number.isSafeInteger(Number(actor)) || Number(actor) <= 0) {
      setError('No se pudo identificar al usuario. Vuelve a iniciar sesión.')
      return
    }
    if (!datosValidos || (!receta && !pendiente)) {
      setError('Selecciona una presentación con receta vigente y una cantidad entre 1 y 1 000 000.')
      return
    }
    const datos = {
      presentacion_id: Number(presentacionId),
      cantidad: Number(cantidad),
      observaciones: observaciones.trim() || null,
    }
    let intento = pendiente
    if (!intento) {
      try {
        intento = { actor, datos, clave: generarClaveProduccion() }
      } catch (err) {
        setError(err.message)
        return
      }
      if (!guardarPendiente(actor, intento)) {
        setError('No se pudo guardar la clave de reintento. Habilita el almacenamiento del navegador antes de registrar la producción.')
        return
      }
      setPendiente(intento)
    }
    setGuardando(true)
    try {
      const respuesta = await registrarProduccionGateway(intento.datos, intento.clave)
      if (respuesta.produccion?.estado === 'COMPLETADA') {
        guardarPendiente(actor, null)
        setPendiente(null)
        navigate('/produccion', { state: { aviso: `Producción #${respuesta.produccion.id_produccion} completada.` } })
      } else if (respuesta.produccion?.estado === 'EN_PROCESO') {
        setMensaje(`La producción #${respuesta.produccion?.id_produccion || ''} sigue en proceso. Reintenta esta misma solicitud para conciliar su resultado.`)
      } else {
        setError('Producción devolvió un estado desconocido. Reintenta la misma solicitud antes de crear otra.')
      }
    } catch (err) {
      if (err.status === 409 && err.data?.produccion?.estado === 'RECHAZADA') {
        guardarPendiente(actor, null)
        setPendiente(null)
        setError(`Producción rechazada: ${err.message}`)
      } else if (err.status === 409 && err.data?.error?.code === 'CLAVE_IDEMPOTENTE_EN_CONFLICTO') {
        guardarPendiente(actor, null)
        setPendiente(null)
        setError(err.message)
      } else if ([401, 403, 404, 422].includes(err.status)) {
        guardarPendiente(actor, null)
        setPendiente(null)
        setError(err.message)
      } else {
        setError(`${err.message} La solicitud podría seguir en proceso; reintenta sin cambiar los datos.`)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva producción</h1>
          <p className="mt-1 text-sm text-gray-500">Elabora unidades a partir de una receta vigente de Catálogo.</p>
        </div>
        <Link to="/produccion" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">Volver al listado</Link>
      </div>

      {mensaje && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!cargando && recetas.length === 0 && !pendiente && <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        No hay recetas vigentes disponibles para registrar una producción.
        <button type="button" onClick={() => { setError(''); setCargando(true); setReintentoCatalogo((valor) => valor + 1) }} className="ml-2 font-semibold text-pink-700 underline">Reintentar consulta</button>
      </div>}

      <form onSubmit={enviar} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Presentación con receta vigente
            <select value={presentacionId} onChange={(evento) => setPresentacionId(evento.target.value)} disabled={Boolean(pendiente) || cargando || guardando} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:bg-gray-100">
              <option value="">{cargando ? 'Cargando recetas...' : 'Seleccionar presentación'}</option>
              {recetas.map((item) => <option key={item.presentacion_id} value={item.presentacion_id}>{item.presentacion?.producto?.nombre || 'Producto'} / {item.presentacion?.nombre || `Presentación #${item.presentacion_id}`}</option>)}
              {pendiente && !receta && <option value={pendiente.datos.presentacion_id}>Presentación #{pendiente.datos.presentacion_id} de la solicitud pendiente</option>}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Cantidad de unidades
            <input type="number" min="1" max="1000000" step="1" inputMode="numeric" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} disabled={Boolean(pendiente) || guardando} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:bg-gray-100" />
          </label>
        </div>

        {receta && !pendiente && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Receta #{receta.id_receta}</h2>
          <p className="mt-1 text-xs text-blue-800">Insumos por unidad. Production calculará las cantidades exactas y Inventory verificará el stock al registrar.</p>
          <ul className="mt-3 space-y-1 text-sm text-blue-900">
            {receta.detalles.map((detalle) => (
              <li key={detalle.id_materia_prima}>
                <span className="font-medium">{detalle.materia_prima?.nombre || `Materia prima #${detalle.id_materia_prima}`}</span>: {formatearCantidad(detalle.cantidad)} {detalle.materia_prima?.unidad_medida || ''} por unidad
                {Number(cantidad) > 1 && (
                  <span className="ml-2 text-xs text-blue-700">
                    (Total: {formatearCantidad(Number(detalle.cantidad) * Number(cantidad))} {detalle.materia_prima?.unidad_medida || ''})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>}

        <label className="block text-sm font-medium text-gray-700">Observaciones (opcional)
          <textarea rows="3" maxLength={2000} value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)} disabled={Boolean(pendiente) || guardando} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:bg-gray-100" />
        </label>
        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button type="submit" disabled={guardando || (!pendiente && (cargando || !receta))} className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-50">
            {guardando ? 'Consultando resultado...' : pendiente ? 'Reintentar misma solicitud' : 'Registrar producción'}
          </button>
        </div>
      </form>
    </section>
  )
}

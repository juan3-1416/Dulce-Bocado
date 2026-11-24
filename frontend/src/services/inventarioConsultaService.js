import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function solicitar(ruta, { method = 'GET', filtros = {}, datos, clave, signal } = {}) {
  const query = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) {
      query.set(clave, String(valor))
    }
  })

  const token = obtenerToken()
  let response
  try {
    response = await fetch(
      `${API_BASE}/api/${ruta}${query.size ? `?${query}` : ''}`,
      {
        method,
        cache: 'no-store',
        signal,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(datos ? { 'Content-Type': 'application/json' } : {}),
          ...(clave ? { 'Idempotency-Key': clave } : {}),
        },
        ...(datos ? { body: JSON.stringify(datos) } : {}),
      },
    )
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('No se pudo conectar con Inventario. Reintenta la consulta.', 503)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError('Inventario devolvió una respuesta inválida.', 503)
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || 'No se pudo consultar Inventario.',
      response.status,
      data,
    )
  }

  return data
}

export async function listarAlmacenes({ signal } = {}) {
  const data = await solicitar('almacenes', { signal })
  if (!Array.isArray(data?.almacenes) || !data.almacenes.every((almacen) =>
    almacen && typeof almacen === 'object' &&
    Number.isSafeInteger(almacen.id_almacen) && almacen.id_almacen > 0 &&
    ['MATERIAS_PRIMAS', 'PRODUCCION', 'MOSTRADOR'].includes(almacen.tipo) &&
    typeof almacen.nombre === 'string' && almacen.nombre.trim() !== '' &&
    typeof almacen.activo === 'boolean'
  )) {
    throw new ApiError('Inventario devolvió un listado de almacenes inválido.', 503)
  }
  return data.almacenes
}

export async function listarExistencias(filtros = {}, { signal } = {}) {
  const data = await solicitar('existencias', { filtros, signal })
  if (!Array.isArray(data?.existencias) || !data.existencias.every((existencia) =>
    existencia && typeof existencia === 'object' &&
    Number.isSafeInteger(existencia.almacen_id) && existencia.almacen_id > 0 &&
    ['MATERIA_PRIMA', 'PRESENTACION'].includes(existencia.tipo_articulo) &&
    Number.isSafeInteger(existencia.articulo_id) && existencia.articulo_id > 0 &&
    typeof existencia.cantidad === 'string' &&
    /^\d{1,9}(?:\.\d{1,3})?$/.test(existencia.cantidad) &&
    ['g', 'ml', 'unidad'].includes(existencia.unidad) &&
    (!filtros.almacen_id || existencia.almacen_id === Number(filtros.almacen_id)) &&
    (!filtros.tipo_articulo || existencia.tipo_articulo === filtros.tipo_articulo) &&
    (!filtros.articulo_id || existencia.articulo_id === Number(filtros.articulo_id))
  )) {
    throw new ApiError('Inventario devolvió un listado de existencias inválido.', 503)
  }
  return data.existencias
}

export async function listarMovimientos(tipo, { signal } = {}) {
  const data = await solicitar('movimientos', { filtros: { tipo }, signal })
  if (!Array.isArray(data?.movimientos)) {
    throw new ApiError('Inventario devolvió un historial de movimientos inválido.', 503)
  }
  return data.movimientos
}

export async function consultarHistorialMovimientos(tipo, { pagina = 1, signal } = {}) {
  const data = await solicitar('movimientos', {
    filtros: { tipo, page: pagina, per_page: 10 }, signal,
  })
  if (!Array.isArray(data?.movimientos) || !data?.paginacion) {
    throw new ApiError('Inventario devolvió un historial inválido.', 503)
  }
  return data
}

export function generarClaveInventario() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `inventario-${crypto.randomUUID()}`
  }
  return `inventario-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

export const registrarIngreso = (datos, clave) =>
  solicitar('ingresos', { method: 'POST', datos, clave })

export const registrarEgreso = (datos, clave) =>
  solicitar('egresos', { method: 'POST', datos, clave })

export const registrarTraslado = (datos, clave) =>
  solicitar('traslados', { method: 'POST', datos, clave })

export async function consultarStockMostrador({ signal } = {}) {
  const almacenes = await listarAlmacenes({ signal })
  const mostrador = almacenes.find((a) => a.tipo === 'MOSTRADOR' && a.activo)
  if (!mostrador) {
    throw new ApiError('No se encontró un almacén Mostrador activo.', 404)
  }
  const existencias = await listarExistencias(
    {
      almacen_id: mostrador.id_almacen,
      tipo_articulo: 'PRESENTACION',
    },
    { signal },
  )

  const stockPorPresentacion = {}
  existencias.forEach((item) => {
    stockPorPresentacion[Number(item.articulo_id)] = Number(item.cantidad)
  })

  return {
    almacen: mostrador,
    existencias,
    stockPorPresentacion,
  }
}


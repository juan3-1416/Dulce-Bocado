import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function consultar(ruta, { filtros = {}, signal } = {}) {
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
        signal,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
  const data = await consultar('almacenes', { signal })
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
  const data = await consultar('existencias', { filtros, signal })
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

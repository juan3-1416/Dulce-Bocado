import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function solicitar(ruta, { method = 'GET', datos, clave, signal } = {}) {
  const token = obtenerToken()
  let respuesta
  try {
    respuesta = await fetch(`${API_BASE}/api/producciones${ruta}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
        ...(clave ? { 'Idempotency-Key': clave } : {}),
      },
      ...(datos ? { body: JSON.stringify(datos) } : {}),
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('No se pudo conectar con Producción. Reintenta con la misma solicitud.', 503)
  }

  let cuerpo
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ApiError('Producción devolvió una respuesta inválida. Reintenta con la misma solicitud.', 503)
  }
  if (!respuesta.ok) {
    throw new ApiError(cuerpo?.error?.message || cuerpo?.message || 'No se pudo completar la solicitud de producción.', respuesta.status, cuerpo)
  }
  return cuerpo
}

export async function listarProduccionesGateway(estado = '', pagina = 1, { signal } = {}) {
  const query = `?${new URLSearchParams({ ...(estado ? { estado } : {}), page: String(pagina) })}`
  const cuerpo = await solicitar(query, { signal })
  if (!Array.isArray(cuerpo?.producciones)) {
    throw new ApiError('Producción devolvió un listado inválido.', 503)
  }
  return cuerpo
}

export async function obtenerProduccionGateway(id, { signal } = {}) {
  const cuerpo = await solicitar(`/${id}`, { signal })
  if (!cuerpo?.produccion || typeof cuerpo.produccion !== 'object') {
    throw new ApiError('Producción devolvió un detalle inválido.', 503)
  }
  return cuerpo.produccion
}

export function registrarProduccionGateway(datos, clave) {
  return solicitar('', { method: 'POST', datos, clave })
}

export function generarClaveProduccion() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `produccion-${crypto.randomUUID()}`
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return `produccion-${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`
  }
  throw new ApiError('El navegador no puede crear una clave segura para esta operación.', 503)
}

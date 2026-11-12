import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function solicitarCatalogo(ruta, { method = 'GET', datos, filtros } = {}) {
  const query = new URLSearchParams()
  Object.entries(filtros ?? {}).forEach(([clave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) query.set(clave, String(valor))
  })
  const sufijo = query.toString() ? `?${query}` : ''
  const token = obtenerToken()
  const response = await fetch(`${API_BASE}/api/${ruta}${sufijo}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(datos ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(datos ? { body: JSON.stringify(datos) } : {}),
  })

  let resultado = {}
  try {
    resultado = await response.json()
  } catch {
    // El error de respuesta sin JSON se informa con un mensaje general.
  }
  if (!response.ok) {
    throw new ApiError(
      resultado.error?.message || resultado.message || 'No se pudo completar la solicitud de Catálogo.',
      response.status,
      resultado,
    )
  }
  return resultado
}

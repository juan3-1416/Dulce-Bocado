import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_URL = `${API_BASE}/api/clientes`

async function solicitar(url, { method = 'GET', body } = {}) {
  const token = obtenerToken()
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    // La API puede devolver una respuesta sin cuerpo.
  }

  if (!response.ok) {
    throw new ApiError(
      data.message || 'No se pudo completar la solicitud de clientes.',
      response.status,
      data,
    )
  }

  return data
}

export function listarClientes(filtros = {}) {
  const query = new URLSearchParams()
  if (filtros.buscar?.trim()) query.set('buscar', filtros.buscar.trim())
  if (filtros.estado !== '' && filtros.estado !== undefined) {
    query.set('estado', String(filtros.estado))
  }
  const suffix = query.toString()
  return solicitar(suffix ? `${API_URL}?${suffix}` : API_URL)
}

export function obtenerCliente(id) {
  return solicitar(`${API_URL}/${id}`)
}

export function crearCliente(datos) {
  return solicitar(API_URL, { method: 'POST', body: datos })
}

export function actualizarCliente(id, datos) {
  return solicitar(`${API_URL}/${id}`, { method: 'PUT', body: datos })
}

export function cambiarEstadoCliente(id, estado) {
  return solicitar(`${API_URL}/${id}/estado`, {
    method: 'PATCH',
    body: { estado },
  })
}

import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function listarPresentacionesVendibles() {
  const token = obtenerToken()
  const response = await fetch(`${API_BASE}/api/presentaciones`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    // La falta de JSON se informa como error de contrato.
  }

  if (!response.ok) {
    throw new ApiError(data.error?.message || data.message || 'Catálogo no está disponible.', response.status, data)
  }

  const presentaciones = data.presentaciones
  if (!Array.isArray(presentaciones) || !presentaciones.every((item) =>
    Number.isInteger(item.presentacion_id)
    && typeof item.nombre === 'string'
    && item.nombre.trim() !== ''
    && typeof item.precio === 'string'
    && /^(?:0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(item.precio)
    && item.moneda === 'BOB'
    && typeof item.disponible === 'boolean'
    && typeof item.permite_personalizacion === 'boolean')) {
    throw new ApiError('El contrato de presentaciones de Catálogo no coincide con Sales.', 502, data)
  }

  return presentaciones
    .filter((item) => item.disponible)
    .map((item) => ({
      ...item,
      etiqueta: item.producto?.nombre
        ? `${item.producto.nombre} — ${item.nombre}`
        : item.nombre,
    }))
}

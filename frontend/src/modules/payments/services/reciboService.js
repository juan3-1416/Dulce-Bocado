import { ApiError, obtenerToken } from './authService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_URL = `${API_BASE}/api/recibos`

export function generarIdempotencyKey(prefijo = 'recibo') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefijo}-${crypto.randomUUID()}`
  }

  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

function obtenerHeaders({ json = false, idempotencyKey = null } = {}) {
  const token = obtenerToken()
  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers['Content-Type'] = 'application/json'
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  return headers
}

async function procesarRespuesta(response) {
  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    const errorBody = data?.error || data || {}
    const mensaje =
      errorBody?.message ||
      data?.message ||
      `Error ${response.status} en el servicio de recibos.`

    throw new ApiError(mensaje, response.status, errorBody)
  }

  return data
}

export async function listarRecibos(params = {}) {
  const query = new URLSearchParams()

  if (params.buscar?.trim()) {
    query.append('buscar', params.buscar.trim())
  }

  if (params.estado) {
    query.append('estado', params.estado)
  }

  if (params.metodo_pago) {
    query.append('metodo_pago', params.metodo_pago)
  }

  const url = query.toString() !== '' ? `${API_URL}?${query.toString()}` : API_URL

  const respuesta = await fetch(url, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(respuesta)
}

export async function obtenerRecibo(id) {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(respuesta)
}

export async function obtenerCatalogosRecibo() {
  const respuesta = await fetch(`${API_URL}/catalogos`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(respuesta)
}

export async function crearRecibo(datos, idempotencyKey = null) {
  const clave = idempotencyKey || generarIdempotencyKey('recibo-crear')

  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: obtenerHeaders({ json: true, idempotencyKey: clave }),
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(respuesta)
}

export async function anularRecibo(id, datos, idempotencyKey = null) {
  const clave = idempotencyKey || generarIdempotencyKey('recibo-anular')

  const respuesta = await fetch(`${API_URL}/${id}/anular`, {
    method: 'POST',
    headers: obtenerHeaders({ json: true, idempotencyKey: clave }),
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(respuesta)
}

export async function registrarImpresionRecibo(id) {
  const respuesta = await fetch(`${API_URL}/${id}/imprimir`, {
    method: 'PATCH',
    headers: obtenerHeaders({ json: true }),
  })

  return procesarRespuesta(respuesta)
}

export function obtenerUrlPdfRecibo(id) {
  return `${API_URL}/${id}/pdf`
}

export async function descargarPdfRecibo(id, nombreArchivo = '') {
  const token = obtenerToken()
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const respuesta = await fetch(`${API_URL}/${id}/pdf`, {
    method: 'GET',
    headers,
  })

  if (!respuesta.ok) {
    let mensajeError = 'No se pudo generar o descargar el PDF del recibo.'
    try {
      const errorJson = await respuesta.json()
      mensajeError = errorJson?.error?.message || errorJson?.message || mensajeError
    } catch {
      // Ignorar si no es JSON
    }
    throw new ApiError(mensajeError, respuesta.status)
  }

  const blob = await respuesta.blob()
  const urlBlob = window.URL.createObjectURL(blob)

  const enlace = document.createElement('a')
  enlace.href = urlBlob
  enlace.download = nombreArchivo || `recibo-${id}.pdf`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)

  window.URL.revokeObjectURL(urlBlob)

  return true
}

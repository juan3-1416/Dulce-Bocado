import {
  ApiError,
  obtenerToken,
} from './authService'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const API_URL = `${API_BASE}/api/ventas`

function generarIdempotencyKey() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `venta-${crypto.randomUUID()}`
  }

  return `venta-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 14)}`
}

function obtenerHeaders({
  json = false,
  idempotencyKey = null,
} = {}) {
  const token = obtenerToken()

  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers['Content-Type'] =
      'application/json'
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] =
      idempotencyKey
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
    const mensaje =
      data?.error?.message ||
      data?.message ||
      'Ocurrió un error al procesar la solicitud.'

    throw new ApiError(
      mensaje,
      response.status,
      data,
    )
  }

  return data
}

export async function listarVentas(
  parametros = {},
) {
  const query = new URLSearchParams()

  if (parametros.estado) {
    query.set(
      'estado',
      parametros.estado,
    )
  }

  if (parametros.per_page) {
    query.set(
      'per_page',
      String(parametros.per_page),
    )
  }

  if (parametros.page) {
    query.set(
      'page',
      String(parametros.page),
    )
  }

  const url = query.toString()
    ? `${API_URL}?${query.toString()}`
    : API_URL

  const response = await fetch(url, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(response)
}

export async function obtenerVenta(id) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: 'GET',
      headers: obtenerHeaders(),
    },
  )

  return procesarRespuesta(response)
}

export async function crearVenta(
  datos,
  idempotencyKey =
    generarIdempotencyKey(),
) {
  const response = await fetch(
    API_URL,
    {
      method: 'POST',
      headers: obtenerHeaders({
        json: true,
        idempotencyKey,
      }),
      body: JSON.stringify(datos),
    },
  )

  return procesarRespuesta(response)
}

export async function actualizarVenta(
  id,
  datos,
  idempotencyKey =
    generarIdempotencyKey(),
) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: 'PUT',
      headers: obtenerHeaders({
        json: true,
        idempotencyKey,
      }),
      body: JSON.stringify(datos),
    },
  )

  return procesarRespuesta(response)
}

export async function anularVenta(
  id,
  motivo,
  idempotencyKey =
    generarIdempotencyKey(),
) {
  const response = await fetch(
    `${API_URL}/${id}/anular`,
    {
      method: 'POST',
      headers: obtenerHeaders({
        json: true,
        idempotencyKey,
      }),
      body: JSON.stringify({
        motivo,
      }),
    },
  )

  return procesarRespuesta(response)
}
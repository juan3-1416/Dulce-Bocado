const API_URL = '/api/produccion'

function obtenerCookie(nombre) {
  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    const [clave, ...valor] = cookie.trim().split('=')

    if (clave === nombre) {
      return valor.join('=')
    }
  }

  return null
}

function obtenerTokenCsrf() {
  const token = obtenerCookie('XSRF-TOKEN')

  return token ? decodeURIComponent(token) : null
}

async function prepararCsrf() {
  const response = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('No se pudo preparar la protección CSRF.')
  }
}

async function procesarRespuesta(response) {
  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    const error = new Error(
      data.message || 'Ocurrió un error al procesar la solicitud.'
    )

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

export async function listarProducciones(filtros = {}) {
  const params = new URLSearchParams()

  if (filtros.estado) params.append('estado', filtros.estado)
  if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde)
  if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta)

  const queryString = params.toString() ? `?${params.toString()}` : ''

  const response = await fetch(`${API_URL}${queryString}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(response)
}

export async function obtenerProduccion(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(response)
}

export async function crearProduccion(datos) {
  await prepararCsrf()

  const token = obtenerTokenCsrf()

  const response = await fetch(API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'X-XSRF-TOKEN': token ?? '',
    },
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(response)
}

export async function actualizarEstado(id, datos) {
  await prepararCsrf()

  const token = obtenerTokenCsrf()

  const response = await fetch(`${API_URL}/${id}/estado`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'X-XSRF-TOKEN': token ?? '',
    },
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(response)
}

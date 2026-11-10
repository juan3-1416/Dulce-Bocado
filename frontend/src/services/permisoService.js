import {
  ApiError,
  eliminarToken,
  obtenerToken,
} from './authService'

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const API_URL = `${BASE_URL}/api/permisos`

async function procesarRespuesta(response) {
  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    if (response.status === 401) {
      eliminarToken()
    }

    throw new ApiError(
      data.message ||
        'Ocurrió un error al procesar la solicitud.',
      response.status,
      data,
    )
  }

  return data
}

function encabezadosAutenticados(
  incluirContenido = false,
) {
  const token = obtenerToken()

  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (incluirContenido) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

export async function listarPermisos() {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: encabezadosAutenticados(),
  })

  return procesarRespuesta(response)
}

export async function obtenerPermiso(id) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: 'GET',
      headers: encabezadosAutenticados(),
    },
  )

  return procesarRespuesta(response)
}

export async function crearPermiso(datos) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: encabezadosAutenticados(true),
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(response)
}

export async function actualizarPermiso(
  id,
  datos,
) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: 'PATCH',
      headers: encabezadosAutenticados(true),
      body: JSON.stringify(datos),
    },
  )

  return procesarRespuesta(response)
}

export async function actualizarEstadoPermiso(
  id,
  activo,
) {
  const response = await fetch(
    `${API_URL}/${id}/estado`,
    {
      method: 'PATCH',
      headers: encabezadosAutenticados(true),
      body: JSON.stringify({
        activo,
      }),
    },
  )

  return procesarRespuesta(response)
}
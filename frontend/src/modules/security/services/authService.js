export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const TOKEN_KEY = 'dulce_bocado_token'

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function eliminarToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function procesarRespuesta(response) {
  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new ApiError(
      data.message ||
        'Ocurrió un error al procesar la solicitud.',
      response.status,
      data,
    )
  }

  return data
}

export async function iniciarSesion(credenciales) {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credenciales),
    },
  )

  const data = await procesarRespuesta(response)

  if (!data.token) {
    throw new ApiError(
      'El servidor no devolvió un token de acceso.',
      500,
      data,
    )
  }

  guardarToken(data.token)

  return data
}

export async function obtenerUsuarioAutenticado() {
  const token = obtenerToken()

  if (!token) {
    return null
  }

  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (response.status === 401) {
    eliminarToken()
    return null
  }

  const data = await procesarRespuesta(response)

  return data.usuario
}

export async function cerrarSesion() {
  const token = obtenerToken()

  if (!token) {
    eliminarToken()

    return {
      message: 'Sesión cerrada correctamente.',
    }
  }

  const response = await fetch(
    `${API_URL}/api/auth/logout`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (response.status === 401) {
    eliminarToken()

    return {
      message: 'Sesión cerrada correctamente.',
    }
  }

  const data = await procesarRespuesta(response)

  eliminarToken()

  return data
}
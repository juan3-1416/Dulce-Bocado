import {
  ApiError,
  obtenerToken,
} from './authService'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

export async function listarResumenPagos(
  tipo = '',
  pagina = 1,
  porPagina = 15,
) {
  const token = obtenerToken()
  const query = new URLSearchParams()

  query.set('page', String(pagina))
  query.set('per_page', String(porPagina))

  if (tipo) {
    query.set('tipo', tipo)
  }

  const url =
    `${API_BASE}/api/pagos` +
    (query.toString()
      ? `?${query.toString()}`
      : '')

  let response

  try {
    response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },
      },
    )
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servicio de pagos.',
      503,
    )
  }

  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message ||
        data?.message ||
        'No se pudo consultar el resumen de pagos.',
      response.status,
      data,
    )
  }

  return data
}
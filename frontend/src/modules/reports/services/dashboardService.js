import { obtenerToken } from '../../../services/authService'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const API_URL = `${API_BASE}/api/dashboard`

async function procesarRespuesta(respuesta) {
  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.message ||
        datos?.error?.message ||
        'Ocurrió un error al cargar los datos del dashboard.'
    )

    error.status = respuesta.status
    error.data = datos
    throw error
  }

  return datos
}

/**
 * Obtiene el resumen general de métricas, KPIs y gráficos para el dashboard.
 * @param {Object} params
 * @param {'hoy'|'7d'|'mes'|'anio'|'personalizado'} params.periodo
 * @param {string} params.fecha_inicio
 * @param {string} params.fecha_fin
 */
export async function obtenerResumenDashboard(params = {}) {
  const query = new URLSearchParams()

  if (params.periodo) {
    query.append('periodo', params.periodo)
  }

  if (params.fecha_inicio) {
    query.append('fecha_inicio', params.fecha_inicio)
  }

  if (params.fecha_fin) {
    query.append('fecha_fin', params.fecha_fin)
  }

  const queryString = query.toString()

  const url = queryString
    ? `${API_URL}/resumen?${queryString}`
    : `${API_URL}/resumen`

  const token = obtenerToken()

  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const respuesta = await fetch(url, {
    method: 'GET',
    headers,
  })

  return procesarRespuesta(respuesta)
}
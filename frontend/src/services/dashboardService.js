const API_URL = '/api/dashboard'

async function procesarRespuesta(respuesta) {
  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.message || 'Ocurrió un error al cargar los datos del dashboard.'
    )
    error.status = respuesta.status
    error.data = datos
    throw error
  }

  return datos
}

/**
 * Obtiene el resumen general de métricas, KPIs y gráficos para el dashboard.
 * @param {Object} params - { periodo: 'hoy'|'7d'|'mes'|'anio', fecha_inicio, fecha_fin }
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
  const url = queryString ? `${API_URL}/resumen?${queryString}` : `${API_URL}/resumen`

  const respuesta = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(respuesta)
}

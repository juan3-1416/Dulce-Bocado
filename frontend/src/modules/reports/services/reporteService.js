import { obtenerToken } from '../../../services/authService'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const API_URL = `${API_BASE}/api/reportes`

function obtenerCabeceras(extraHeaders = {}) {
  const token = obtenerToken()
  const cabeceras = {
    Accept: 'application/json',
    ...extraHeaders,
  }

  if (token) {
    cabeceras.Authorization = `Bearer ${token}`
  }

  return cabeceras
}

async function procesarRespuesta(respuesta) {
  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.message || datos?.error?.message || 'Ocurrió un error al consultar el reporte.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  return {
    status: respuesta.status,
    data: datos,
  }
}

function construirQuery(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([clave, valor]) => {
    if (
      valor !== undefined &&
      valor !== null &&
      valor !== ''
    ) {
      query.append(clave, valor)
    }
  })

  const queryString = query.toString()

  return queryString ? `?${queryString}` : ''
}

export async function obtenerReporteVentas(params = {}) {
  const respuesta = await fetch(
    `${API_URL}/ventas${construirQuery(params)}`,
    {
      method: 'GET',
      headers: obtenerCabeceras(),
    }
  )

  return procesarRespuesta(respuesta)
}

export async function obtenerReportePedidos(params = {}) {
  const respuesta = await fetch(
    `${API_URL}/pedidos${construirQuery(params)}`,
    {
      method: 'GET',
      headers: obtenerCabeceras(),
    }
  )

  return procesarRespuesta(respuesta)
}

export async function obtenerReporteInventario(params = {}) {
  const respuesta = await fetch(
    `${API_URL}/inventario${construirQuery(params)}`,
    {
      method: 'GET',
      headers: obtenerCabeceras(),
    }
  )

  return procesarRespuesta(respuesta)
}

export async function descargarReportePdf(tipo, params = {}) {
  const respuesta = await fetch(
    `${API_URL}/${tipo}/pdf${construirQuery(params)}`,
    {
      method: 'GET',
      headers: obtenerCabeceras({
        Accept: 'application/pdf',
      }),
    }
  )

  if (!respuesta.ok) {
    let datos = null

    try {
      datos = await respuesta.json()
    } catch {
      datos = null
    }

    const error = new Error(
      datos?.message || datos?.error?.message || 'No se pudo generar el PDF.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  const blob = await respuesta.blob()
  const url = window.URL.createObjectURL(blob)
  const enlace = document.createElement('a')

  enlace.href = url
  enlace.download = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.pdf`

  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  window.URL.revokeObjectURL(url)
}

export async function enviarReporteCorreo(
  tipo,
  correos,
  params = {}
) {
  const respuesta = await fetch(
    `${API_URL}/${tipo}/enviar${construirQuery(params)}`,
    {
      method: 'POST',
      headers: obtenerCabeceras({
        'Content-Type': 'application/json; charset=utf-8',
      }),
      body: JSON.stringify({
        correos,
      }),
    }
  )

  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.message || datos?.error?.message || 'No se pudo enviar el reporte por correo.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  return datos
}

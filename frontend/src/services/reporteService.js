const API_URL = '/api/reportes'

async function procesarRespuesta(respuesta) {
  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.message || 'Ocurrió un error al consultar el reporte.'
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
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(respuesta)
}

export async function obtenerReportePedidos(params = {}) {
  const respuesta = await fetch(
    `${API_URL}/pedidos${construirQuery(params)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(respuesta)
}

export async function obtenerReporteInventario(params = {}) {
  const respuesta = await fetch(
    `${API_URL}/inventario${construirQuery(params)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(respuesta)
}
export async function descargarReportePdf(tipo, params = {}) {
  const respuesta = await fetch(
    `${API_URL}/${tipo}/pdf${construirQuery(params)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
      },
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
      datos?.message || 'No se pudo generar el PDF.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  const blob = await respuesta.blob()

  const url = window.URL.createObjectURL(blob)

  const enlace = document.createElement('a')

  enlace.href = url

  enlace.download =
    `reporte_${tipo}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`

  document.body.appendChild(enlace)

  enlace.click()
  enlace.remove()

  window.URL.revokeObjectURL(url)
}
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

  return token
    ? decodeURIComponent(token)
    : null
}

async function prepararCsrf() {
  const response = await fetch(
    '/sanctum/csrf-cookie',
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      'No se pudo preparar la protección CSRF.'
    )
  }
}
export async function enviarReporteCorreo(
  tipo,
  correos,
  params = {}
) {
  await prepararCsrf()

  const token = obtenerTokenCsrf()

  const respuesta = await fetch(
    `${API_URL}/${tipo}/enviar${construirQuery(params)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type':
          'application/json; charset=utf-8',
        'X-XSRF-TOKEN': token ?? '',
      },
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
      datos?.message ||
        'No se pudo enviar el reporte por correo.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  return datos
}
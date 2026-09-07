const API_URL = '/api/recibos'

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

async function prepararCsrf() {
  const respuesta = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo obtener el token CSRF.')
  }

  const token = obtenerCookie('XSRF-TOKEN')

  if (!token) {
    throw new Error('No se encontró el token CSRF.')
  }

  return decodeURIComponent(token)
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
      datos?.message ||
        'Ocurrió un error al procesar la solicitud.'
    )

    error.status = respuesta.status
    error.data = datos

    throw error
  }

  return datos
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

  const url =
    query.toString() !== ''
      ? `${API_URL}?${query.toString()}`
      : API_URL

  const respuesta = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(respuesta)
}

export async function obtenerRecibo(id) {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(respuesta)
}

export async function obtenerCatalogosRecibo() {
  const respuesta = await fetch(`${API_URL}/catalogos`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return procesarRespuesta(respuesta)
}

export async function crearRecibo(datos) {
  const token = await prepararCsrf()

  const respuesta = await fetch(API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(respuesta)
}

export async function anularRecibo(id, datos) {
  const token = await prepararCsrf()

  const respuesta = await fetch(
    `${API_URL}/${id}/anular`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': token,
      },
      body: JSON.stringify(datos),
    }
  )

  return procesarRespuesta(respuesta)
}

export async function registrarImpresionRecibo(id) {
  const token = await prepararCsrf()

  const respuesta = await fetch(
    `${API_URL}/${id}/imprimir`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': token,
      },
    }
  )

  return procesarRespuesta(respuesta)
}
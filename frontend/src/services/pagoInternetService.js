const API_URL = '/api/pagos-internet'
const API_QR_URL = '/api/pago-qr'

function obtenerCookie(nombre) {
  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    const [clave, ...valor] = cookie
      .trim()
      .split('=')

    if (clave === nombre) {
      return valor.join('=')
    }
  }

  return null
}

function obtenerTokenCsrf() {
  const token =
    obtenerCookie('XSRF-TOKEN')

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

async function procesarRespuesta(
  response
) {
  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
        'Ocurrió un error al procesar la solicitud.'
    )

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

/*
|--------------------------------------------------------------------------
| Listar pagos por internet
|--------------------------------------------------------------------------
*/

export async function listarPagosInternet(
  parametros = {}
) {
  const query =
    new URLSearchParams()

  if (parametros.buscar) {
    query.set(
      'buscar',
      parametros.buscar
    )
  }

  if (parametros.estado) {
    query.set(
      'estado',
      parametros.estado
    )
  }

  const url = query.toString()
    ? `${API_URL}?${query.toString()}`
    : API_URL

  const response = await fetch(
    url,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Consultar pago por internet
|--------------------------------------------------------------------------
*/

export async function obtenerPagoInternet(
  id
) {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Obtener catálogos
|--------------------------------------------------------------------------
*/

export async function obtenerCatalogosPagoInternet() {
  const response = await fetch(
    `${API_URL}/catalogos`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Crear transacción de pago QR
|--------------------------------------------------------------------------
*/

export async function crearPagoInternet(
  datos
) {
  await prepararCsrf()

  const token =
    obtenerTokenCsrf()

  const response = await fetch(
    API_URL,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type':
          'application/json; charset=utf-8',
        'X-XSRF-TOKEN':
          token ?? '',
      },
      body: JSON.stringify(
        datos
      ),
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Confirmación manual antigua
|--------------------------------------------------------------------------
|
| Se mantiene temporalmente por compatibilidad.
| Después podremos retirarla del frontend
| cuando el flujo QR quede completamente validado.
|
|--------------------------------------------------------------------------
*/

export async function confirmarPagoInternet(
  id,
  datos
) {
  await prepararCsrf()

  const token =
    obtenerTokenCsrf()

  const response = await fetch(
    `${API_URL}/${id}/confirmar`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type':
          'application/json; charset=utf-8',
        'X-XSRF-TOKEN':
          token ?? '',
      },
      body: JSON.stringify(
        datos
      ),
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Consultar QR público
|--------------------------------------------------------------------------
|
| No requiere autenticación.
| Se utiliza tanto desde la pantalla pública
| del cliente como desde el polling del vendedor.
|
|--------------------------------------------------------------------------
*/

export async function consultarPagoQr(
  tokenQr
) {
  const response = await fetch(
    `${API_QR_URL}/${tokenQr}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return procesarRespuesta(
    response
  )
}

/*
|--------------------------------------------------------------------------
| Confirmar QR público
|--------------------------------------------------------------------------
|
| En la simulación académica,
| abrir y procesar el QR representa
| la confirmación que normalmente
| enviaría una pasarela o banco.
|
|--------------------------------------------------------------------------
*/

export async function confirmarPagoQr(
  tokenQr
) {
  const response = await fetch(
    `${API_QR_URL}/${tokenQr}/confirmar`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type':
          'application/json; charset=utf-8',
      },
    }
  )

  return procesarRespuesta(
    response
  )
}
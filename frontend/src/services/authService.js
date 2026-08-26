class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
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

async function leerRespuesta(respuesta) {
  try {
    return await respuesta.json()
  } catch {
    return {}
  }
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
    throw new ApiError(
      'No se pudo establecer la protección CSRF.',
      respuesta.status,
    )
  }

  const cookie = obtenerCookie('XSRF-TOKEN')

  if (!cookie) {
    throw new ApiError(
      'No se pudo obtener el token CSRF.',
      500,
    )
  }

  return decodeURIComponent(cookie)
}

export async function obtenerUsuarioAutenticado() {
  const respuesta = await fetch('/api/auth/usuario', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (respuesta.status === 401) {
    return null
  }

  const datos = await leerRespuesta(respuesta)

  if (!respuesta.ok) {
    throw new ApiError(
      datos.message || 'No se pudo comprobar la sesión.',
      respuesta.status,
      datos,
    )
  }

  return datos.usuario
}

export async function iniciarSesion(nombreUsuario, contrasena) {
  const token = await prepararCsrf()

  const respuesta = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',

    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },

    body: JSON.stringify({
      nombre_usuario: nombreUsuario,
      contrasena,
    }),
  })

  const datos = await leerRespuesta(respuesta)

  if (!respuesta.ok) {
    throw new ApiError(
      datos.message || 'No se pudo iniciar sesión.',
      respuesta.status,
      datos,
    )
  }

  return datos
}

export async function cerrarSesion() {
  // Después del login Laravel puede regenerar la sesión,
  // por lo que solicitamos un token CSRF actualizado.
  const token = await prepararCsrf()

  const respuesta = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',

    headers: {
      Accept: 'application/json',
      'X-XSRF-TOKEN': token,
    },
  })

  const datos = await leerRespuesta(respuesta)

  if (!respuesta.ok) {
    throw new ApiError(
      datos.message || 'No se pudo cerrar la sesión.',
      respuesta.status,
      datos,
    )
  }

  return datos
}

export { ApiError }
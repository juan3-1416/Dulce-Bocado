import {
  ApiError,
  eliminarToken,
  obtenerToken,
} from './authService'

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const ASIGNACIONES_URL =
  `${BASE_URL}/api/asignaciones`

const USUARIOS_URL =
  `${BASE_URL}/api/usuarios`

const ROLES_URL =
  `${BASE_URL}/api/roles`

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

function headers(conContenido = false) {
  const token = obtenerToken()

  const resultado = {
    Accept: 'application/json',
  }

  if (token) {
    resultado.Authorization =
      `Bearer ${token}`
  }

  if (conContenido) {
    resultado['Content-Type'] =
      'application/json'
  }

  return resultado
}

export async function listarUsuarioRolPermisos(
  usuarioId = null,
) {
  const url = usuarioId
    ? `${ASIGNACIONES_URL}?usuario_id=${encodeURIComponent(usuarioId)}`
    : ASIGNACIONES_URL

  const response = await fetch(url, {
    method: 'GET',
    headers: headers(),
  })

  return procesarRespuesta(response)
}

export async function obtenerCatalogosUsuarioRolPermiso() {
  const [
    respuestaUsuarios,
    respuestaRoles,
  ] = await Promise.all([
    fetch(USUARIOS_URL, {
      headers: headers(),
    }),
    fetch(ROLES_URL, {
      headers: headers(),
    }),
  ])

  const usuariosData =
    await procesarRespuesta(
      respuestaUsuarios,
    )

  const rolesData =
    await procesarRespuesta(
      respuestaRoles,
    )

  return {
    usuarios:
      usuariosData.usuarios ?? [],
    roles:
      rolesData.roles ?? [],
  }
}

export async function asignarUsuarioRolPermiso(
  usuarioId,
  rolPermisoId,
) {
  const response = await fetch(
    ASIGNACIONES_URL,
    {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        usuario_id:
          Number(usuarioId),
        rol_permiso_id:
          Number(rolPermisoId),
      }),
    },
  )

  return procesarRespuesta(response)
}

export async function asignarRolAUsuario(
  usuarioId,
  rolId,
) {
  const response = await fetch(
    `${ASIGNACIONES_URL}/asignar-rol`,
    {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        usuario_id:
          Number(usuarioId),
        rol_id:
          Number(rolId),
      }),
    },
  )

  return procesarRespuesta(response)
}

export async function quitarUsuarioRolPermiso(
  id,
) {
  const response = await fetch(
    `${ASIGNACIONES_URL}/${id}`,
    {
      method: 'DELETE',
      headers: headers(),
    },
  )

  return procesarRespuesta(response)
}

export async function quitarRolAUsuario(
  usuarioId,
  rolId,
) {
  const response = await fetch(
    `${ASIGNACIONES_URL}/quitar-rol`,
    {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        usuario_id:
          Number(usuarioId),
        rol_id:
          Number(rolId),
      }),
    },
  )

  return procesarRespuesta(response)
}
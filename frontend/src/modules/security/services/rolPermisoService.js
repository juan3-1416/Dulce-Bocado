import {
  ApiError,
  eliminarToken,
  obtenerToken,
} from './authService'

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'

const ROLES_URL = `${BASE_URL}/api/roles`
const PERMISOS_URL = `${BASE_URL}/api/permisos`

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

async function obtenerRoles() {
  const response = await fetch(ROLES_URL, {
    headers: headers(),
  })

  const data =
    await procesarRespuesta(response)

  return data.roles ?? []
}

async function obtenerPermisos() {
  const response = await fetch(
    PERMISOS_URL,
    {
      headers: headers(),
    },
  )

  const data =
    await procesarRespuesta(response)

  return data.permisos ?? []
}

async function obtenerPermisosRol(rolId) {
  const response = await fetch(
    `${ROLES_URL}/${rolId}/permisos`,
    {
      headers: headers(),
    },
  )

  return procesarRespuesta(response)
}

export async function listarRolPermisos() {
  const roles = await obtenerRoles()

  const respuestas = await Promise.all(
    roles.map(async (rol) => {
      const data =
        await obtenerPermisosRol(
          rol.id_rol,
        )

      return (data.relaciones ?? []).map(
        (relacion) => ({
          ...relacion,
          rol,
        }),
      )
    }),
  )

  return {
    relaciones: respuestas.flat(),
  }
}

export async function obtenerCatalogosRolPermiso() {
  const [roles, permisos] =
    await Promise.all([
      obtenerRoles(),
      obtenerPermisos(),
    ])

  return {
    roles,
    permisos,
  }
}

export async function asignarRolPermiso(
  rolId,
  permisoId,
) {
  const actual =
    await obtenerPermisosRol(rolId)

  const ids = [
    ...(actual.permisos ?? []).map(
      (permiso) =>
        permiso.id_permiso,
    ),
    Number(permisoId),
  ]

  const permisoIds = [
    ...new Set(ids),
  ]

  const response = await fetch(
    `${ROLES_URL}/${rolId}/permisos`,
    {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify({
        permiso_ids: permisoIds,
      }),
    },
  )

  const data =
    await procesarRespuesta(response)

  return {
    ...data,
    message:
      'Permiso asignado al rol correctamente.',
  }
}

export async function quitarRolPermiso(
  idRolPermiso,
) {
  const listado =
    await listarRolPermisos()

  const relacion =
    listado.relaciones.find(
      (item) =>
        Number(
          item.id_rol_permiso,
        ) ===
        Number(idRolPermiso),
    )

  if (!relacion) {
    throw new ApiError(
      'La relación Rol-Permiso no existe.',
      404,
      {},
    )
  }

  const actual =
    await obtenerPermisosRol(
      relacion.rol.id_rol,
    )

  const permisoIds =
    (actual.permisos ?? [])
      .filter(
        (permiso) =>
          Number(
            permiso.id_permiso,
          ) !==
          Number(
            relacion.permiso
              .id_permiso,
          ),
      )
      .map(
        (permiso) =>
          permiso.id_permiso,
      )

  const response = await fetch(
    `${ROLES_URL}/${relacion.rol.id_rol}/permisos`,
    {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify({
        permiso_ids: permisoIds,
      }),
    },
  )

  const data =
    await procesarRespuesta(response)

  return {
    ...data,
    message:
      'Permiso quitado del rol correctamente.',
  }
}
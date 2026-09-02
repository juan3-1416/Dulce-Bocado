const API_URL = '/api/seguridad/usuario-rol-permisos';

function obtenerCookie(nombre) {
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
        const [clave, ...valor] = cookie.trim().split('=');

        if (clave === nombre) {
            return valor.join('=');
        }
    }

    return null;
}

function obtenerTokenCsrf() {
    const token = obtenerCookie('XSRF-TOKEN');

    return token
        ? decodeURIComponent(token)
        : null;
}

async function prepararCsrf() {
    const response = await fetch('/sanctum/csrf-cookie', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(
            'No se pudo preparar la protección CSRF.'
        );
    }
}

async function procesarRespuesta(response) {
    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        const error = new Error(
            data.message ||
            'Ocurrió un error al procesar la solicitud.'
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

export async function listarUsuarioRolPermisos(usuarioId = null) {
    const url = usuarioId
        ? `${API_URL}?usuario_id=${encodeURIComponent(usuarioId)}`
        : API_URL;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    return procesarRespuesta(response);
}

export async function obtenerCatalogosUsuarioRolPermiso() {
    const response = await fetch(`${API_URL}/catalogos`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    return procesarRespuesta(response);
}

export async function asignarUsuarioRolPermiso(usuarioId, rolPermisoId) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({
            usuario_id: Number(usuarioId),
            rol_permiso_id: Number(rolPermisoId),
        }),
    });

    return procesarRespuesta(response);
}

export async function asignarRolAUsuario(usuarioId, rolId) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/asignar-rol`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({
            usuario_id: Number(usuarioId),
            rol_id: Number(rolId),
        }),
    });

    return procesarRespuesta(response);
}

export async function quitarUsuarioRolPermiso(id) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
    });

    return procesarRespuesta(response);
}

export async function quitarRolAUsuario(usuarioId, rolId) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/quitar-rol`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({
            usuario_id: Number(usuarioId),
            rol_id: Number(rolId),
        }),
    });

    return procesarRespuesta(response);
}

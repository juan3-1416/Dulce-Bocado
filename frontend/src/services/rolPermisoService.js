const API_URL = '/api/seguridad/rol-permisos';

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

export async function listarRolPermisos() {
    const response = await fetch(API_URL, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    return procesarRespuesta(response);
}

export async function obtenerCatalogosRolPermiso() {
    const response = await fetch(
        `${API_URL}/catalogos`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );

    return procesarRespuesta(response);
}

export async function asignarRolPermiso(
    rolId,
    permisoId
) {
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
            rol_id: Number(rolId),
            permiso_id: Number(permisoId),
        }),
    });

    return procesarRespuesta(response);
}
export async function quitarRolPermiso(id) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(
        `${API_URL}/${id}`,
        {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-XSRF-TOKEN': token ?? '',
            },
        }
    );

    return procesarRespuesta(response);
}
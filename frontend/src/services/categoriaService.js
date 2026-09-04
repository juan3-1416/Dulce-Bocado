const API_URL = '/api/productos/categorias';

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

export async function listarCategorias(params = {}) {
    const url = new URL(API_URL, window.location.origin);
    if (params.solo_activas) {
        url.searchParams.append('solo_activas', '1');
    }

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    return procesarRespuesta(response);
}

export async function crearCategoria(datos) {
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
        body: JSON.stringify(datos),
    });

    return procesarRespuesta(response);
}

export async function actualizarCategoria(id, datos) {
    await prepararCsrf();
    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify(datos),
    });

    return procesarRespuesta(response);
}

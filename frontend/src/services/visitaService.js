const API_URL = '/api/visitas';

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
            'Ocurrió un error al procesar las visitas.'
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

export async function registrarVisita(ruta) {
    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/registrar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify({ ruta }),
    });

    return procesarRespuesta(response);
}

export async function obtenerVisitas() {
    const response = await fetch(API_URL, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    return procesarRespuesta(response);
}

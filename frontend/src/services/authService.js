export class ApiError extends Error {
    constructor(message, status = 500, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

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
        throw new ApiError(
            data.message || 'Ocurrió un error al procesar la solicitud.',
            response.status,
            data
        );
    }

    return data;
}

export async function prepararCsrf() {
    const response = await fetch('/sanctum/csrf-cookie', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new ApiError(
            'No se pudo preparar la protección CSRF.',
            response.status
        );
    }
}

export async function obtenerUsuarioAutenticado() {
    const response = await fetch('/api/auth/usuario', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    if (response.status === 401) {
        return null;
    }

    const data = await procesarRespuesta(response);

    return data.usuario;
}

export async function iniciarSesion(credenciales) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify(credenciales),
    });

    return procesarRespuesta(response);
}

export async function cerrarSesion() {
    /*
     * Laravel regenera la sesión después del login,
     * por eso obtenemos un CSRF actualizado antes
     * de cerrar la sesión.
     */
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
    });

    return procesarRespuesta(response);
}
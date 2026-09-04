const API_URL = '/api/productos/presentaciones';

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

export async function listarPresentaciones(filtros = {}) {
    const url = new URL(API_URL, window.location.origin);
    
    if (filtros.id_producto) {
        url.searchParams.append('id_producto', filtros.id_producto);
    }
    
    if (filtros.estado !== undefined && filtros.estado !== '') {
        url.searchParams.append('estado', filtros.estado ? '1' : '0');
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

export async function crearPresentacion(datos) {
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

export async function actualizarPresentacion(id, datos) {
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

export async function cambiarEstadoPresentacion(id, estado) {
    await prepararCsrf();
    const token = obtenerTokenCsrf();

    const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({ estado }),
    });

    return procesarRespuesta(response);
}

export async function asignarPresentacionProducto(idProducto, datos) {
    await prepararCsrf();
    const token = obtenerTokenCsrf();

    const response = await fetch(`/api/productos/${idProducto}/presentaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({
            id_presentacion: datos.id_presentacion,
            precio: datos.precio,
        }),
    });

    return procesarRespuesta(response);
}

export async function actualizarPrecioPresentacionProducto(idProducto, idPresentacion, datos) {
    await prepararCsrf();
    const token = obtenerTokenCsrf();

    const response = await fetch(`/api/productos/${idProducto}/presentaciones/${idPresentacion}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
        body: JSON.stringify({
            precio: datos.precio,
        }),
    });

    return procesarRespuesta(response);
}

export async function desvincularPresentacionProducto(idProducto, idPresentacion) {
    await prepararCsrf();
    const token = obtenerTokenCsrf();

    const response = await fetch(`/api/productos/${idProducto}/presentaciones/${idPresentacion}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ?? '',
        },
    });

    return procesarRespuesta(response);
}


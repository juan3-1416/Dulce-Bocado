const API_URL = '/api/pedidos';

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
    const response = await fetch(
        '/sanctum/csrf-cookie',
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );

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

/*
|--------------------------------------------------------------------------
| Listar pedidos
|--------------------------------------------------------------------------
*/

export async function listarPedidos(
    filtros = {}
) {
    const url = new URL(
        API_URL,
        window.location.origin
    );

    if (filtros.buscar) {
        url.searchParams.append(
            'buscar',
            filtros.buscar
        );
    }

    if (filtros.estado) {
        url.searchParams.append(
            'estado',
            filtros.estado
        );
    }

    if (filtros.fecha_entrega) {
        url.searchParams.append(
            'fecha_entrega',
            filtros.fecha_entrega
        );
    }

    const response = await fetch(
        url,
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

/*
|--------------------------------------------------------------------------
| Obtener pedido
|--------------------------------------------------------------------------
*/

export async function obtenerPedido(id) {
    const response = await fetch(
        `${API_URL}/${id}`,
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

/*
|--------------------------------------------------------------------------
| Obtener catálogos
|--------------------------------------------------------------------------
*/

export async function obtenerCatalogosPedido() {
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

/*
|--------------------------------------------------------------------------
| Crear pedido
|--------------------------------------------------------------------------
*/

export async function crearPedido(datos) {
    await prepararCsrf();

    const token =
        obtenerTokenCsrf();

    const response = await fetch(
        API_URL,
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type':
                    'application/json',
                'X-XSRF-TOKEN':
                    token ?? '',
            },
            body: JSON.stringify(datos),
        }
    );

    return procesarRespuesta(response);
}

/*
|--------------------------------------------------------------------------
| Actualizar pedido
|--------------------------------------------------------------------------
*/

export async function actualizarPedido(
    id,
    datos
) {
    await prepararCsrf();

    const token =
        obtenerTokenCsrf();

    const response = await fetch(
        `${API_URL}/${id}`,
        {
            method: 'PUT',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type':
                    'application/json',
                'X-XSRF-TOKEN':
                    token ?? '',
            },
            body: JSON.stringify(datos),
        }
    );

    return procesarRespuesta(response);
}

/*
|--------------------------------------------------------------------------
| Cambiar estado pedido
|--------------------------------------------------------------------------
*/

export async function cambiarEstadoPedido(id, datos) {
    await prepararCsrf();

    const token = obtenerTokenCsrf();

    const response = await fetch(
        `${API_URL}/${id}/estado`,
        {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': token ?? '',
            },
            body: JSON.stringify(datos),
        }
    );

    return procesarRespuesta(response);
}
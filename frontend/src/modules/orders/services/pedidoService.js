import {
    ApiError,
    obtenerToken,
} from './authService'

import {
    listarClientes,
} from './clienteService'

import {
    listarPresentacionesVendibles,
} from './catalogoVentasService'

const API_BASE =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080'

const API_URL =
    `${API_BASE}/api/pedidos`

function obtenerHeaders(
    json = false
) {
    const token = obtenerToken()

    const headers = {
        Accept: 'application/json',
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`
    }

    if (json) {
        headers['Content-Type'] =
            'application/json'
    }

    return headers
}

async function procesarRespuesta(
    response
) {
    let data = {}

    try {
        data = await response.json()
    } catch {
        data = {}
    }

    if (!response.ok) {
        const mensaje =
            data?.error?.message ||
            data?.message ||
            'Ocurrió un error al procesar la solicitud.'

        throw new ApiError(
            mensaje,
            response.status,
            data,
        )
    }

    return data
}

async function solicitarPedido(
    url,
    {
        method = 'GET',
        body = null,
    } = {}
) {
    let response

    try {
        response = await fetch(
            url,
            {
                method,
                headers:
                    obtenerHeaders(
                        body !== null
                    ),
                ...(body !== null
                    ? {
                        body:
                            JSON.stringify(
                                body
                            ),
                    }
                    : {}),
            }
        )
    } catch {
        throw new ApiError(
            'No se pudo conectar con Pedidos. Reintenta la operación.',
            503,
        )
    }

    return procesarRespuesta(
        response
    )
}

/*
|--------------------------------------------------------------------------
| Compatibilidad temporal con la UI existente
|--------------------------------------------------------------------------
|
| El nuevo order-service guarda presentacion_id y snapshots.
| La interfaz antigua todavía usa id_producto_presentacion,
| producto_presentacion y cliente.
|
| Esta capa permite migrar el servicio sin rehacer todo el modal.
|
*/

function normalizarDetalle(
    detalle
) {
    if (!detalle) {
        return detalle
    }

    return {
        ...detalle,

        id_producto_presentacion:
            detalle
                .id_producto_presentacion ??
            detalle.presentacion_id,

        precio_unitario:
            detalle.precio_unitario ??
            detalle
                .precio_unitario_snapshot,

        producto_presentacion:
            detalle
                .producto_presentacion ??
            {
                producto: {
                    nombre:
                        detalle
                            .nombre_producto_snapshot ??
                        'Producto',
                },

                presentacion: {
                    nombre:
                        detalle
                            .nombre_presentacion_snapshot ??
                        'Presentación',
                },
            },
    }
}

function normalizarPedido(
    pedido
) {
    if (!pedido) {
        return pedido
    }

    const cliente =
        pedido.cliente ??
        (
            pedido.id_cliente
                ? {
                    id_cliente:
                        pedido.id_cliente,

                    nombre:
                        pedido
                            .nombre_cliente_snapshot ??
                        'Cliente registrado',

                    apellido: '',
                }
                : null
        )

    return {
        ...pedido,

        cliente,

        detalles:
            Array.isArray(
                pedido.detalles
            )
                ? pedido.detalles.map(
                    normalizarDetalle
                )
                : [],
    }
}

function normalizarRespuesta(
    data
) {
    if (
        Array.isArray(
            data?.pedidos
        )
    ) {
        return {
            ...data,

            pedidos:
                data.pedidos.map(
                    normalizarPedido
                ),
        }
    }

    if (data?.pedido) {
        return {
            ...data,

            pedido:
                normalizarPedido(
                    data.pedido
                ),
        }
    }

    return data
}

/*
|--------------------------------------------------------------------------
| Listar pedidos
|--------------------------------------------------------------------------
*/

export async function listarPedidos(
    filtros = {}
) {
    const query =
        new URLSearchParams()

    if (filtros.buscar?.trim()) {
        query.set(
            'buscar',
            filtros.buscar.trim()
        )
    }

    if (filtros.estado) {
        query.set(
            'estado',
            filtros.estado
        )
    }

    if (filtros.fecha_entrega) {
        query.set(
            'fecha_entrega',
            filtros.fecha_entrega
        )
    }

    const url =
        query.toString()
            ? `${API_URL}?${query.toString()}`
            : API_URL

    const data =
        await solicitarPedido(
            url
        )

    return normalizarRespuesta(
        data
    )
}

/*
|--------------------------------------------------------------------------
| Obtener pedido
|--------------------------------------------------------------------------
*/

export async function obtenerPedido(
    id
) {
    const data =
        await solicitarPedido(
            `${API_URL}/${id}`
        )

    return normalizarRespuesta(
        data
    )
}

/*
|--------------------------------------------------------------------------
| Obtener catálogos para el modal
|--------------------------------------------------------------------------
|
| Ya no existe /api/pedidos/catalogos.
|
| React consulta Customer y Catalog por sus APIs públicas
| y adapta las respuestas al formato esperado por PedidoModal.
|
*/

export async function obtenerCatalogosPedido() {
    const [
        respuestaClientes,
        presentaciones,
    ] = await Promise.all([
        listarClientes({
            estado: 1,
        }),

        listarPresentacionesVendibles(),
    ])

    return {
        clientes:
            respuestaClientes
                .clientes ??
            [],

        presentaciones:
            presentaciones.map(
                (item) => ({
                    id_producto_presentacion:
                        item.presentacion_id,

                    precio:
                        item.precio,

                    permite_personalizacion:
                        item
                            .permite_personalizacion,

                    producto:
                        item.producto ??
                        null,

                    presentacion: {
                        presentacion_id:
                            item.presentacion_id,

                        nombre:
                            item.nombre,
                    },
                })
            ),

        tipos_cliente: [
            'REGISTRADO',
            'OCASIONAL',
        ],
    }
}

/*
|--------------------------------------------------------------------------
| Crear pedido
|--------------------------------------------------------------------------
*/

export async function crearPedido(
    datos
) {
    const data =
        await solicitarPedido(
            API_URL,
            {
                method: 'POST',
                body: datos,
            }
        )

    return normalizarRespuesta(
        data
    )
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
    const data =
        await solicitarPedido(
            `${API_URL}/${id}`,
            {
                method: 'PUT',
                body: datos,
            }
        )

    return normalizarRespuesta(
        data
    )
}

/*
|--------------------------------------------------------------------------
| Cambiar estado
|--------------------------------------------------------------------------
*/

export async function cambiarEstadoPedido(
    id,
    datos
) {
    const data =
        await solicitarPedido(
            `${API_URL}/${id}/estado`,
            {
                method: 'PATCH',
                body: datos,
            }
        )

    return normalizarRespuesta(
        data
    )
}

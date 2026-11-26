import { ApiError, obtenerToken } from './authService'
import { listarVentas } from './ventaService'
import { listarPedidos } from './pedidoService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_URL = `${API_BASE}/api/pagos`

export function generarIdempotencyKey(prefijo = 'pago') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefijo}-${crypto.randomUUID()}`
  }

  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

function obtenerHeaders({ json = false, idempotencyKey = null } = {}) {
  const token = obtenerToken()
  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers['Content-Type'] = 'application/json'
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  return headers
}

async function procesarRespuesta(response) {
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
      'Ocurrió un error al procesar el pago.'

    throw new ApiError(mensaje, response.status, data)
  }

  return data
}

async function solicitarPago(url, opciones) {
  let response
  try {
    response = await fetch(url, opciones)
  } catch {
    throw new ApiError('No se pudo conectar con el servicio de Pagos. Reintenta la operación.', 503)
  }

  return procesarRespuesta(response)
}

/**
 * Registra un pago en efectivo mediante Payment Service a través del Gateway.
 * POST /api/pagos/efectivo
 */
export async function registrarPagoEfectivo(
  { origen_tipo, origen_id, monto, moneda = 'BOB' },
  idempotencyKey = generarIdempotencyKey('pago-efec'),
) {
  const payload = {
    origen_tipo: String(origen_tipo).toUpperCase(),
    origen_id: Number(origen_id),
    monto: Number(monto).toFixed(2),
    moneda: String(moneda).toUpperCase(),
  }

  return solicitarPago(`${API_URL}/efectivo`, {
    method: 'POST',
    headers: obtenerHeaders({
      json: true,
      idempotencyKey,
    }),
    body: JSON.stringify(payload),
  })
}

/**
 * Inicia la intención de cobro QR en la pasarela Libélula mediante Payment Service.
 * POST /api/pagos/qr
 */
export async function iniciarPagoQr(
  { origen_tipo, origen_id, monto, moneda = 'BOB' },
  idempotencyKey = generarIdempotencyKey('pago-qr'),
) {
  const payload = {
    origen_tipo: String(origen_tipo).toUpperCase(),
    origen_id: Number(origen_id),
    monto: Number(monto).toFixed(2),
    moneda: String(moneda).toUpperCase(),
  }

  return solicitarPago(`${API_URL}/qr`, {
    method: 'POST',
    headers: obtenerHeaders({
      json: true,
      idempotencyKey,
    }),
    body: JSON.stringify(payload),
  })
}

/**
 * Consulta el estado de un intento de cobro QR en Payment Service.
 * GET /api/pagos/qr/{id}
 */
export async function consultarEstadoQr(idIntentoQr) {
  return solicitarPago(`${API_URL}/qr/${idIntentoQr}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })
}

/**
 * Consulta pagos y saldo en tiempo real de una Venta o Pedido desde Payment Service.
 * GET /api/pagos?origen=VENTA|PEDIDO&origen_id=ID
 */
export async function consultarPagosOrigen(origen, origenId) {
  const query = new URLSearchParams({
    origen: String(origen).toUpperCase(),
    origen_id: String(origenId),
  })

  return solicitarPago(`${API_URL}?${query.toString()}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })
}

/**
 * Obtiene los documentos disponibles para cobro consultando los microservicios propietarios:
 * - Ventas en estado BORRADOR desde Sales Service
 * - Pedidos pagables desde Order Service
 */
export async function obtenerCatalogosPago() {
  const [ventasResp, pedidosResp] = await Promise.allSettled([
    listarVentas({ estado: 'BORRADOR', per_page: 50 }),
    listarPedidos({ per_page: 50 }),
  ])

  const ventas = ventasResp.status === 'fulfilled' ? (ventasResp.value?.data ?? []) : []
  const pedidos = pedidosResp.status === 'fulfilled' ? (pedidosResp.value?.pedidos ?? pedidosResp.value?.data ?? []) : []

  return {
    ventas,
    pedidos,
    metodos_pago: ['EFECTIVO', 'QR'],
  }
}

/**
 * Compatibilidad con usePagoFormulario existente.
 */
export async function crearPago(datos, idempotencyKey = generarIdempotencyKey('pago-efec')) {
  const origenTipo = datos.id_venta ? 'VENTA' : 'PEDIDO'
  const origenId = datos.id_venta || datos.id_pedido

  return registrarPagoEfectivo(
    {
      origen_tipo: origenTipo,
      origen_id: origenId,
      monto: datos.monto,
      moneda: 'BOB',
    },
    idempotencyKey,
  )
}

/**
 * Consulta listado de pagos. Si recibe origen y origen_id, consulta a payment-service.
 */
export async function listarPagos(parametros = {}) {
  const { origen, origen_id } = parametros

  if (origen && origen_id) {
    return consultarPagosOrigen(origen, origen_id)
  }

  const query = new URLSearchParams()
  if (parametros.buscar) query.set('buscar', parametros.buscar)
  if (parametros.estado) query.set('estado', parametros.estado)
  if (parametros.metodo_pago) query.set('metodo_pago', parametros.metodo_pago)

  const url = query.toString() ? `${API_URL}?${query.toString()}` : API_URL

  return solicitarPago(url, {
    method: 'GET',
    headers: obtenerHeaders(),
  })
}

export async function obtenerPago(id) {
  return solicitarPago(`${API_URL}/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })
}

export async function anularPago(id, motivoAnulacion, idempotencyKey = generarIdempotencyKey('pago-anul')) {
  return solicitarPago(`${API_URL}/${id}/anular`, {
    method: 'PATCH',
    headers: obtenerHeaders({
      json: true,
      idempotencyKey,
    }),
    body: JSON.stringify({
      motivo_anulacion: motivoAnulacion,
    }),
  })
}

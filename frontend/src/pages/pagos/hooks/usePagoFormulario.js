import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  consultarPagosOrigen,
  generarIdempotencyKey,
  iniciarPagoQr,
  registrarPagoEfectivo,
} from '../../../services/pagoService'

/**
 * Gestiona el estado del formulario de pago y la lógica de submit adaptada a microservicios.
 * En Sprint 4 (HU11 - T409), el cobro en efectivo y cálculo de saldo se realizan contra payment-service.
 * Los pagos QR se integrarán al cierre del Sprint 4 con la API oficial provista por el Product Owner.
 */
export function usePagoFormulario({
  abierto,
  ventas = [],
  pedidos = [],
  _metodosPago = ['EFECTIVO', 'QR'],
  ventaInicialId = null,
  pedidoSeleccionadoInicial = null,
  onGuardado,
  onCerrar,
  onIniciarQr,
  setError,
}) {
  const [tipoCobro, setTipoCobro] = useState('venta')
  const [idVenta, setIdVenta] = useState('')
  const [idPedido, setIdPedido] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargandoSaldo, setCargandoSaldo] = useState(false)
  const [resumenSaldo, setResumenSaldo] = useState(null)

  const intentoPago = useRef(null)

  // Consultar saldo autorizado directamente en payment-service
  const consultarSaldoServidor = useCallback(async (tipo, id) => {
    if (!id || Number(id) <= 0) {
      setResumenSaldo(null)
      return
    }

    try {
      setCargandoSaldo(true)
      const data = await consultarPagosOrigen(tipo, id)
      setResumenSaldo({
        total: Number(data.total ?? 0),
        pagado: Number(data.pagado ?? 0),
        saldo: Number(data.saldo ?? 0),
        estado_origen: data.estado_origen,
        moneda: data.moneda || 'BOB',
      })
    } catch {
      // Si payment-service falla al consultar, se mantendrá el saldo preliminar del documento
      setResumenSaldo(null)
    } finally {
      setCargandoSaldo(false)
    }
  }, [])

  useEffect(() => {
    if (!abierto) {
      setIdVenta('')
      setIdPedido('')
      setMonto('')
      setMetodoPago('EFECTIVO')
      setReferencia('')
      setObservaciones('')
      setError('')
      setResumenSaldo(null)
      intentoPago.current = null
      return
    }

    intentoPago.current = null
    setError('')

    if (pedidoSeleccionadoInicial) {
      setTipoCobro('pedido')
      const id = String(pedidoSeleccionadoInicial.id_pedido)
      setIdPedido(id)
      setMonto(String(pedidoSeleccionadoInicial.saldo ?? pedidoSeleccionadoInicial.total ?? ''))
      void consultarSaldoServidor('PEDIDO', id)
      return
    }

    if (ventaInicialId) {
      setTipoCobro('venta')
      const id = String(ventaInicialId)
      setIdVenta(id)
      const ventaInicial = ventas.find((v) => Number(v.id_venta) === Number(id))
      if (ventaInicial) {
        setMonto(String(ventaInicial.total ?? ''))
      }
      void consultarSaldoServidor('VENTA', id)
      return
    }

    if (pedidos.length > 0 && ventas.length === 0) {
      setTipoCobro('pedido')
    } else {
      setTipoCobro('venta')
    }
  }, [
    abierto,
    ventaInicialId,
    pedidoSeleccionadoInicial,
    ventas,
    pedidos,
    setError,
    consultarSaldoServidor,
  ])

  const ventaSeleccionada = useMemo(
    () => ventas.find((v) => Number(v.id_venta) === Number(idVenta)) ?? null,
    [ventas, idVenta],
  )

  const pedidoSeleccionado = useMemo(
    () => pedidos.find((p) => Number(p.id_pedido) === Number(idPedido)) ?? null,
    [pedidos, idPedido],
  )

  const documentoBase = tipoCobro === 'venta' ? ventaSeleccionada : pedidoSeleccionado

  const documentoSeleccionado = useMemo(() => {
    if (!documentoBase) return null

    const total = resumenSaldo?.total ?? Number(documentoBase.total ?? 0)
    const pagado = resumenSaldo?.pagado ?? Number(documentoBase.total_pagado ?? 0)
    const saldo = resumenSaldo?.saldo ?? (total - pagado)

    return {
      ...documentoBase,
      total,
      total_pagado: pagado,
      saldo: Math.max(0, saldo),
    }
  }, [documentoBase, resumenSaldo])

  const obtenerNombreCliente = (documento) => {
    if (!documento) return ''
    if (documento.cliente) {
      return [documento.cliente.nombre, documento.cliente.apellido]
        .filter(Boolean)
        .join(' ')
    }
    return documento.nombre_cliente_ocasional || 'Cliente ocasional'
  }

  const manejarCambioVenta = (event) => {
    const nuevoId = event.target.value
    setIdVenta(nuevoId)
    setError('')
    intentoPago.current = null

    if (nuevoId) {
      void consultarSaldoServidor('VENTA', nuevoId)
    } else {
      setResumenSaldo(null)
      setMonto('')
    }
  }

  const manejarCambioPedido = (event) => {
    const nuevoId = event.target.value
    setIdPedido(nuevoId)
    setError('')
    intentoPago.current = null

    if (nuevoId) {
      void consultarSaldoServidor('PEDIDO', nuevoId)
    } else {
      setResumenSaldo(null)
      setMonto('')
    }
  }

  const usarSaldoCompleto = () => {
    if (documentoSeleccionado) {
      setMonto(String(Number(documentoSeleccionado.saldo).toFixed(2)))
    }
  }

  const manejarSubmit = async (event) => {
    event.preventDefault()

    if (tipoCobro === 'venta' && !idVenta) {
      setError('Debe seleccionar una venta.')
      return
    }

    if (tipoCobro === 'pedido' && !idPedido) {
      setError('Debe seleccionar un pedido.')
      return
    }

    const montoNumero = Number(monto)
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto del pago debe ser mayor a cero.')
      return
    }

    const saldoPendiente = Number(documentoSeleccionado?.saldo ?? 0)

    if (saldoPendiente <= 0) {
      setError('La operación seleccionada no tiene saldo pendiente por cobrar.')
      return
    }

    if (montoNumero > saldoPendiente + 0.001) {
      setError(
        `El monto ingresado (Bs ${montoNumero.toFixed(2)}) supera el saldo pendiente de Bs ${saldoPendiente.toFixed(2)}.`,
      )
      return
    }

    // Las ventas directas deben pagarse completamente.
    // Los pedidos mantienen la posibilidad de pagos parciales.
    if (
      tipoCobro === 'venta' &&
      Math.round(montoNumero * 100) !== Math.round(saldoPendiente * 100)
    ) {
      setError(
        `La venta debe pagarse completamente. Saldo pendiente: Bs ${saldoPendiente.toFixed(2)}.`,
      )
      return
    }

    const origenTipo = tipoCobro === 'venta' ? 'VENTA' : 'PEDIDO'
    const origenId = tipoCobro === 'venta' ? Number(idVenta) : Number(idPedido)

    // Flujo de cobro QR con Pasarela Libélula
    if (metodoPago === 'QR') {
      const claveEsperada = `qr:${origenTipo}:${origenId}:${montoNumero.toFixed(2)}`
      if (intentoPago.current?.clavePayload !== claveEsperada) {
        intentoPago.current = {
          clavePayload: claveEsperada,
          idempotencyKey: generarIdempotencyKey('pago-qr'),
        }
      }

      try {
        setGuardando(true)
        setError('')

        const respuesta = await iniciarPagoQr(
          {
            origen_tipo: origenTipo,
            origen_id: origenId,
            monto: montoNumero,
            moneda: 'BOB',
          },
          intentoPago.current.idempotencyKey,
        )

        intentoPago.current = null

        const intento = respuesta?.intento_qr ?? respuesta
        if (onIniciarQr && intento) {
          onIniciarQr(intento)
        }
      } catch (err) {
        const code = err.data?.error?.code
        if (code === 'SOBREPAGO') {
          const details = err.data?.error?.details
          setError(
            `Sobrepago rechazado: El monto supera el saldo disponible (Saldo actual: Bs ${Number(details?.saldo ?? 0).toFixed(2)}).`,
          )
        } else if (code === 'VENTA_NO_PAGABLE' || code === 'VENTA_NO_CONFIRMADA') {
          setError('La venta no se encuentra en un estado que permita cobrar por QR.')
        } else if (code === 'PEDIDO_NO_PAGABLE') {
          setError('El pedido no se encuentra en un estado que admita cobros.')
        } else if (code === 'ORIGEN_CANCELADO') {
          setError('La operación se encuentra cancelada y no admite pagos.')
        } else if (code === 'PASARELA_LIBELULA_ERROR') {
          setError(
            `Error de pasarela Libélula: ${err.data?.error?.message || 'No se pudo generar el cobro QR.'}`,
          )
        } else if (err.status === 403) {
          setError('No tienes permiso para generar cobros QR (se requiere pagos.crear).')
        } else {
          setError(err.message || 'No se pudo generar el código QR.')
        }
      } finally {
        setGuardando(false)
      }
      return
    }

    if (metodoPago !== 'EFECTIVO') {
      setError('Seleccione un método de pago válido (Efectivo o QR).')
      return
    }

    // Gestión de Idempotencia estricta para Efectivo
    const claveEsperada = `${origenTipo}:${origenId}:${montoNumero.toFixed(2)}`
    if (intentoPago.current?.clavePayload !== claveEsperada) {
      intentoPago.current = {
        clavePayload: claveEsperada,
        idempotencyKey: generarIdempotencyKey('pago-efec'),
      }
    }

    try {
      setGuardando(true)
      setError('')

      const respuesta = await registrarPagoEfectivo(
        {
          origen_tipo: origenTipo,
          origen_id: origenId,
          monto: montoNumero,
          moneda: 'BOB',
        },
        intentoPago.current.idempotencyKey,
      )

      intentoPago.current = null

      const mensajeExito =
        respuesta?.message ||
        `Pago en efectivo de Bs ${montoNumero.toFixed(2)} registrado correctamente.`

      await onGuardado(mensajeExito, respuesta?.pago, {
        flujo: 'EFECTIVO',
        resumen: respuesta?.resumen,
      })

      onCerrar()
    } catch (err) {
      const code = err.data?.error?.code

      if (code === 'SOBREPAGO') {
        const details = err.data?.error?.details
        setError(
          `Sobrepago rechazado: El monto supera el saldo disponible (Saldo actual: Bs ${Number(details?.saldo ?? 0).toFixed(2)}).`,
        )
      } else if (code === 'VENTA_NO_PAGABLE' || code === 'VENTA_NO_CONFIRMADA') {
        setError(
          'La venta no se encuentra en un estado que permita registrar pagos.',
        )
      } else if (code === 'PEDIDO_NO_PAGABLE') {
        setError(
          'El pedido no se encuentra en un estado que admita cobros.',
        )
      } else if (code === 'ORIGEN_CANCELADO') {
        setError(
          'La operación se encuentra cancelada y no admite nuevos pagos.',
        )
      } else if (code === 'CLAVE_IDEMPOTENTE_CONFLICTIVA') {
        setError(
          'La solicitud fue rechazada por conflicto con otra clave de idempotencia.',
        )
      } else if (err.status === 403) {
        setError(
          'No tienes permiso para registrar pagos (se requiere pagos.crear).',
        )
      } else {
        setError(
          err.message || 'No se pudo registrar el pago en efectivo.',
        )
      }
    } finally {
      setGuardando(false)
    }
  }

  return {
    tipoCobro,
    setTipoCobro,
    idVenta,
    idPedido,
    monto,
    setMonto,
    metodoPago,
    setMetodoPago,
    referencia,
    setReferencia,
    observaciones,
    setObservaciones,
    guardando,
    cargandoSaldo,
    documentoSeleccionado,
    ventaSeleccionada,
    pedidoSeleccionado,
    manejarCambioVenta,
    manejarCambioPedido,
    usarSaldoCompleto,
    obtenerNombreCliente,
    manejarSubmit,
  }
}

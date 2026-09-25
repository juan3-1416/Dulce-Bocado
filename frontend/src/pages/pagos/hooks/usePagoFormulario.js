import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { crearPago } from '../../../services/pagoService'
import { crearPagoInternet } from '../../../services/pagoInternetService'

/**
 * Gestiona el estado del formulario de pago y la lógica de submit.
 *
 * Para el flujo QR, llama a `onIniciarQr(transaccion)` en lugar de
 * modificar estado propio, de modo que el hook usePagoQr tome el control.
 *
 * @param {object} params
 * @param {boolean}      params.abierto
 * @param {Array}        params.ventas
 * @param {Array}        params.pedidos
 * @param {Array}        params.metodosPago
 * @param {number|null}  params.ventaInicialId
 * @param {object|null}  params.pedidoSeleccionadoInicial
 * @param {Function}     params.onGuardado
 * @param {Function}     params.onCerrar
 * @param {Function}     params.onIniciarQr
 * @param {Function}     params.setError  — setter compartido del PagoModal
 */
export function usePagoFormulario({
  abierto,
  ventas,
  pedidos,
  metodosPago,
  ventaInicialId,
  pedidoSeleccionadoInicial,
  onGuardado,
  onCerrar,
  onIniciarQr,
  setError,
}) {
  const [tipoCobro, setTipoCobro] =
    useState('venta')

  const [idVenta, setIdVenta] =
    useState('')

  const [idPedido, setIdPedido] =
    useState('')

  const [monto, setMonto] =
    useState('')

  const [metodoPago, setMetodoPago] =
    useState('EFECTIVO')

  const [referencia, setReferencia] =
    useState('')

  const [observaciones, setObservaciones] =
    useState('')

  const [guardando, setGuardando] =
    useState(false)

  /*
   * Inicialización del formulario
   * cada vez que se abre el modal.
   */
  useEffect(() => {
    if (!abierto) return

    setIdVenta('')
    setIdPedido('')
    setMonto('')

    setMetodoPago(
      metodosPago?.[0] || 'EFECTIVO'
    )

    setReferencia('')
    setObservaciones('')
    setError('')

    if (pedidoSeleccionadoInicial) {
      setTipoCobro('pedido')

      setIdPedido(
        String(pedidoSeleccionadoInicial.id_pedido)
      )

      setMonto(
        String(pedidoSeleccionadoInicial.saldo)
      )

      return
    }

    if (ventaInicialId) {
      const ventaInicial = ventas.find(
        (venta) =>
          Number(venta.id_venta) ===
          Number(ventaInicialId)
      )

      setTipoCobro('venta')
      setIdVenta(String(ventaInicialId))

      if (ventaInicial) {
        setMonto(String(ventaInicial.saldo))
      }

      return
    }

    if (
      pedidos.length > 0 &&
      ventas.length === 0
    ) {
      setTipoCobro('pedido')
    } else {
      setTipoCobro('venta')
    }
  }, [
    abierto,
    metodosPago,
    ventaInicialId,
    pedidoSeleccionadoInicial,
    ventas,
    pedidos,
    setError,
  ])

  const ventaSeleccionada = useMemo(
    () =>
      ventas.find(
        (venta) =>
          Number(venta.id_venta) === Number(idVenta)
      ) ?? null,
    [ventas, idVenta]
  )

  const pedidoSeleccionado = useMemo(
    () =>
      pedidos.find(
        (pedido) =>
          Number(pedido.id_pedido) === Number(idPedido)
      ) ?? null,
    [pedidos, idPedido]
  )

  const documentoSeleccionado =
    tipoCobro === 'venta'
      ? ventaSeleccionada
      : pedidoSeleccionado

  const obtenerNombreCliente = (documento) => {
    if (!documento) return ''

    if (documento.cliente) {
      return [
        documento.cliente.nombre,
        documento.cliente.apellido,
      ]
        .filter(Boolean)
        .join(' ')
    }

    return (
      documento.nombre_cliente_ocasional ||
      'Cliente ocasional'
    )
  }

  const obtenerMensajeError = (errorPeticion) => {
    const errores = errorPeticion.data?.errors

    if (errores) {
      const primerError =
        Object.values(errores)[0]

      if (Array.isArray(primerError)) {
        return primerError[0]
      }
    }

    return (
      errorPeticion.message ||
      'No se pudo procesar el pago.'
    )
  }

  const manejarCambioVenta = (event) => {
    const nuevoId = event.target.value
    setIdVenta(nuevoId)
    setError('')

    const venta = ventas.find(
      (item) => Number(item.id_venta) === Number(nuevoId)
    )

    /*
     * Una venta directa siempre debe cobrarse por el saldo completo.
     */
    setMonto(venta ? String(venta.saldo) : '')
  }

  const manejarCambioPedido = (event) => {
    setIdPedido(event.target.value)
    setMonto('')
    setError('')
  }

  const usarSaldoCompleto = () => {
    if (documentoSeleccionado) {
      setMonto(String(documentoSeleccionado.saldo))
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

    if (
      !Number.isFinite(montoNumero) ||
      montoNumero <= 0
    ) {
      setError('El monto debe ser mayor a cero.')
      return
    }

    const saldo = Number(
      documentoSeleccionado?.saldo ?? 0
    )

    /*
     * Venta directa:
     * obligatoriamente pago completo.
     */
    if (
      tipoCobro === 'venta' &&
      Math.abs(montoNumero - saldo) > 0.001
    ) {
      setError(
        `La venta debe pagarse por el total pendiente de Bs ${saldo.toFixed(
          2
        )}.`
      )
      return
    }

    /*
     * Pedido:
     * sí puede recibir pagos parciales,
     * pero nunca superiores al saldo.
     */
    if (
      tipoCobro === 'pedido' &&
      montoNumero > saldo
    ) {
      setError(
        `El monto no puede superar el saldo pendiente de Bs ${saldo.toFixed(
          2
        )}.`
      )
      return
    }

    if (!['EFECTIVO', 'QR'].includes(metodoPago)) {
      setError('Seleccione un método de pago válido.')
      return
    }

    /*
     * QR real mediante Libélula.
     */
    if (metodoPago === 'QR') {
      if (tipoCobro !== 'venta') {
        setError(
          'El pago mediante QR de la pasarela está habilitado actualmente para ventas.'
        )
        return
      }

      try {
        setGuardando(true)
        setError('')

        const respuesta = await crearPagoInternet({
          id_venta: Number(idVenta),
          monto: montoNumero,
        })

        const transaccion = respuesta.transaccion

        if (!transaccion?.qr_simple_url) {
          throw new Error(
            'Libélula no devolvió una imagen QR válida.'
          )
        }

        onIniciarQr(transaccion)
        setReferencia('')
      } catch (errorPeticion) {
        setError(obtenerMensajeError(errorPeticion))
      } finally {
        setGuardando(false)
      }

      return
    }

    /*
     * Pago normal en efectivo.
     */
    try {
      setGuardando(true)
      setError('')

      const payload = {
        monto: montoNumero,
        metodo_pago: 'EFECTIVO',
        referencia: referencia.trim() || null,
        observaciones: observaciones.trim() || null,
      }

      if (tipoCobro === 'venta') {
        payload.id_venta = Number(idVenta)
      } else {
        payload.id_pedido = Number(idPedido)
      }

      const respuesta = await crearPago(payload)

      await onGuardado(
        respuesta?.message ||
          'Pago registrado correctamente.',
        respuesta?.pago ?? null,
        { flujo: 'EFECTIVO', recibo_generado: false }
      )

      onCerrar()
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion))
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

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  consultarPagoQr,
  obtenerPagoInternet,
} from '../../../services/pagoInternetService'

/**
 * Gestiona todo el ciclo de vida de un pago QR:
 * — estado de la transacción
 * — cuenta regresiva de vencimiento
 * — polling periódico del estado
 * — exposición de `iniciarQr` para que el formulario
 *   entregue el control cuando la pasarela responde
 *
 * @param {object}   params
 * @param {boolean}  params.abierto
 * @param {Function} params.onGuardado
 * @param {Function} params.onCerrar
 * @param {Function} params.setError  — setter compartido del PagoModal
 */
export function usePagoQr({
  abierto,
  onGuardado,
  onCerrar,
  setError,
}) {
  const [transaccionQr, setTransaccionQr] =
    useState(null)

  const [estadoQr, setEstadoQr] =
    useState(null)

  const [segundosRestantes, setSegundosRestantes] =
    useState(0)

  const [consultandoQr, setConsultandoQr] =
    useState(false)

  const timeoutQrRef  = useRef(null)
  const qrNotificadoRef = useRef(false)

  /*
   * Limpia el estado QR cada vez que el modal se abre.
   */
  useEffect(() => {
    if (!abierto) return

    if (timeoutQrRef.current) {
      clearTimeout(timeoutQrRef.current)
      timeoutQrRef.current = null
    }

    setTransaccionQr(null)
    setEstadoQr(null)
    setSegundosRestantes(0)
    setConsultandoQr(false)
    qrNotificadoRef.current = false
  }, [abierto])

  /*
   * Limpia el timeout al desmontar el componente.
   */
  useEffect(() => {
    return () => {
      if (timeoutQrRef.current) {
        clearTimeout(timeoutQrRef.current)
      }
    }
  }, [])

  /*
   * Cuenta regresiva del QR.
   */
  useEffect(() => {
    if (
      !transaccionQr?.fecha_vencimiento ||
      estadoQr !== 'PENDIENTE'
    ) {
      return
    }

    const actualizar = () => {
      const vencimiento = new Date(
        transaccionQr.fecha_vencimiento
      ).getTime()

      const restante = Math.max(
        0,
        Math.ceil((vencimiento - Date.now()) / 1000)
      )

      setSegundosRestantes(restante)
    }

    actualizar()

    const intervalo = setInterval(actualizar, 1000)

    return () => clearInterval(intervalo)
  }, [transaccionQr, estadoQr])

  /*
   * Polling QR.
   *
   * Utilizamos setTimeout después
   * de terminar cada petición para
   * evitar solicitudes superpuestas.
   */
  useEffect(() => {
    if (
      !abierto ||
      !transaccionQr?.token_qr ||
      estadoQr !== 'PENDIENTE'
    ) {
      return
    }

    let cancelado = false

    const token = transaccionQr.token_qr
    const idTransaccion = transaccionQr.id_pago_internet

    const verificarEstado = async () => {
      let continuar = true

      try {
        setConsultandoQr(true)

        const respuesta = await consultarPagoQr(token)

        if (cancelado) return

        const nuevoEstado =
          respuesta.transaccion?.estado

        if (!nuevoEstado) return

        if (nuevoEstado === 'APROBADO') {
          continuar = false

          if (qrNotificadoRef.current) return

          qrNotificadoRef.current = true

          /*
           * Recuperamos primero el pago
           * generado por el backend.
           *
           * No actualizamos todavía el
           * estado local del QR porque
           * hacerlo aquí limpiaría este
           * efecto antes de ejecutar
           * onGuardado.
           */
          const detalle = await obtenerPagoInternet(
            idTransaccion
          )

          const pago =
            detalle.transaccion?.pago ?? null

          if (!pago?.id_pago) {
            throw new Error(
              'El pago QR fue aprobado, pero no se pudo recuperar el pago generado.'
            )
          }

          /*
           * VentasPage recupera el recibo
           * que el backend ya generó y
           * abre ReciboDetalleModal.
           */
          await onGuardado(
            'Pago QR confirmado correctamente. El recibo fue generado automáticamente.',
            pago,
            { flujo: 'QR', recibo_generado: true }
          )

          /*
           * Solo después de completar el
           * flujo del recibo actualizamos
           * el estado visual y cerramos
           * este modal.
           */
          setEstadoQr('APROBADO')
          onCerrar()

          return
        }

        /*
         * Para los demás estados sí
         * podemos actualizar el estado
         * local inmediatamente.
         */
        setEstadoQr(nuevoEstado)

        if (nuevoEstado === 'VENCIDO') {
          continuar = false
          setError('El código QR venció. Genere un nuevo QR.')
          return
        }

        if (nuevoEstado === 'RECHAZADO') {
          continuar = false
          setError('El pago QR fue rechazado.')
        }
      } catch (errorPeticion) {
        /*
         * Un error aislado no
         * cancela el QR.
         */
        console.error('Error al consultar QR:', errorPeticion)
      } finally {
        if (!cancelado) {
          setConsultandoQr(false)
        }
      }

      if (!cancelado && continuar) {
        timeoutQrRef.current = setTimeout(
          verificarEstado,
          5000
        )
      }
    }

    verificarEstado()

    return () => {
      cancelado = true

      if (timeoutQrRef.current) {
        clearTimeout(timeoutQrRef.current)
        timeoutQrRef.current = null
      }
    }
  }, [
    abierto,
    transaccionQr,
    estadoQr,
    onGuardado,
    onCerrar,
    setError,
  ])

  /** Formatea segundos como MM:SS. */
  const formatearTiempo = (totalSegundos) => {
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60

    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  }

  /**
   * Permite al usuario pedir un QR nuevo cuando el anterior venció
   * o fue rechazado. Vuelve al estado sin transacción activa.
   */
  const generarOtroQr = () => {
    setTransaccionQr(null)
    setEstadoQr(null)
    setError('')
    qrNotificadoRef.current = false
  }

  /**
   * Recibe la transacción devuelta por la pasarela y activa el
   * panel QR. Es llamado por usePagoFormulario tras `crearPagoInternet`.
   *
   * @param {object} transaccion
   */
  const iniciarQr = (transaccion) => {
    qrNotificadoRef.current = false
    setTransaccionQr(transaccion)
    setEstadoQr(transaccion.estado || 'PENDIENTE')
  }

  const urlQr = transaccionQr?.token_qr
    ? `${window.location.origin}/pago-qr/${transaccionQr.token_qr}`
    : ''

  const qrPendiente  = estadoQr === 'PENDIENTE'
  const qrAprobado   = estadoQr === 'APROBADO'
  const qrVencido    = estadoQr === 'VENCIDO'

  return {
    transaccionQr,
    estadoQr,
    segundosRestantes,
    consultandoQr,
    urlQr,
    qrPendiente,
    qrAprobado,
    qrVencido,
    formatearTiempo,
    generarOtroQr,
    iniciarQr,
  }
}

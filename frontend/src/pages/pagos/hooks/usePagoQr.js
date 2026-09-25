import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  obtenerPagoInternet,
} from '../../../services/pagoInternetService'

/**
 * Gestiona el ciclo de vida de un pago QR (Libélula):
 * — estado de la transacción
 * — polling periódico del estado vía backend (obtenerPagoInternet)
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

  const [consultandoQr, setConsultandoQr] =
    useState(false)

  const timeoutQrRef = useRef(null)
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
   * Polling QR.
   *
   * El frontend consulta periódicamente a nuestro backend,
   * el cual se actualiza cuando Libélula confirma el pago
   * vía webhook o aviso público.
   */
  useEffect(() => {
    if (
      !abierto ||
      !transaccionQr?.id_pago_internet ||
      estadoQr !== 'PENDIENTE'
    ) {
      return
    }

    let cancelado = false
    const idTransaccion = transaccionQr.id_pago_internet

    const verificarEstado = async () => {
      let continuar = true

      try {
        setConsultandoQr(true)

        const detalle = await obtenerPagoInternet(idTransaccion)

        if (cancelado) return

        const transaccion = detalle?.transaccion
        const nuevoEstado = transaccion?.estado

        if (!nuevoEstado) return

        if (nuevoEstado === 'APROBADO') {
          continuar = false

          if (qrNotificadoRef.current) return
          qrNotificadoRef.current = true

          const pago = transaccion?.pago ?? null

          if (!pago?.id_pago) {
            throw new Error(
              'El pago QR fue aprobado, pero no se pudo recuperar el pago generado.'
            )
          }

          await onGuardado(
            'Pago QR confirmado correctamente. El recibo fue generado automáticamente.',
            pago,
            { flujo: 'QR', recibo_generado: true }
          )

          setEstadoQr('APROBADO')
          onCerrar()
          return
        }

        setEstadoQr(nuevoEstado)

        if (nuevoEstado === 'RECHAZADO') {
          continuar = false
          setError(
            transaccion?.motivo_rechazo ||
            'El pago QR fue rechazado.'
          )
        }

        if (nuevoEstado === 'VENCIDO') {
          continuar = false
          setError('La transacción QR ya no está disponible.')
        }
      } catch (errorPeticion) {
        console.error(
          'Error al consultar el estado del pago QR:',
          errorPeticion
        )
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

  /**
   * Recibe la transacción devuelta por Libélula y activa el
   * panel QR. Es llamado por usePagoFormulario tras `crearPagoInternet`.
   *
   * @param {object} transaccion
   */
  const iniciarQr = (transaccion) => {
    qrNotificadoRef.current = false
    setTransaccionQr(transaccion)
    setEstadoQr(transaccion.estado || 'PENDIENTE')
  }

  const qrPendiente = estadoQr === 'PENDIENTE'
  const qrAprobado = estadoQr === 'APROBADO'
  const qrVencido = estadoQr === 'VENCIDO'

  return {
    transaccionQr,
    estadoQr,
    consultandoQr,
    qrPendiente,
    qrAprobado,
    qrVencido,
    iniciarQr,
  }
}

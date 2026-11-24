import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  consultarEstadoQr,
} from '../../../services/pagoService'

/**
 * Gestiona el ciclo de vida de un pago QR (Libélula) en microservicios:
 * — estado del intento de pago QR
 * — polling periódico del estado vía payment-service (consultarEstadoQr)
 * — exposición de `iniciarQr` para que el formulario
 *   entregue el control cuando la pasarela responde
 *
 * @param {object}   params
 * @param {boolean}  params.abierto
 * @param {Function} params.onGuardado
 * @param {Function} params.onCerrar
 * @param {Function} params.setError  — setter compartido del PagoModal
 */
const normalizarEstadoQr = (estado) => {
  switch (estado) {
    case 'INICIADA':
    case 'PENDIENTE':
      return 'PENDIENTE'

    case 'CONFIRMADA':
    case 'APROBADO':
      return 'APROBADO'

    case 'RECHAZADA':
    case 'RECHAZADO':
      return 'RECHAZADO'

    case 'EXPIRADA':
    case 'VENCIDO':
      return 'VENCIDO'

    default:
      return estado || 'PENDIENTE'
  }
}
export function usePagoQr({
  abierto,
  onGuardado,
  onCerrar,
  setError,
}) {
  const [transaccionQr, setTransaccionQr] = useState(null)
  const [estadoQr, setEstadoQr] = useState(null)
  const [consultandoQr, setConsultandoQr] = useState(false)

  const timeoutQrRef = useRef(null)
  const qrNotificadoRef = useRef(false)

  /*
   * Limpia el estado QR cada vez que el modal se abre o cierra.
   */
  useEffect(() => {
    if (!abierto) {
      if (timeoutQrRef.current) {
        clearTimeout(timeoutQrRef.current)
        timeoutQrRef.current = null
      }
      setTransaccionQr(null)
      setEstadoQr(null)
      setConsultandoQr(false)
      qrNotificadoRef.current = false
    }
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
   * El frontend consulta periódicamente a nuestro payment-service,
   * el cual se actualiza cuando Libélula envía el aviso GET de pago confirmado.
   */
  useEffect(() => {
    const idIntento = transaccionQr?.id_intento_qr || transaccionQr?.id_pago_internet

    if (!abierto || !idIntento || estadoQr !== 'PENDIENTE') {
      return
    }

    let cancelado = false

    const verificarEstado = async () => {
      let continuar = true

      try {
        setConsultandoQr(true)

        const respuesta = await consultarEstadoQr(idIntento)

        if (cancelado) return

        const intento = respuesta?.intento_qr ?? respuesta
        const nuevoEstado = normalizarEstadoQr(intento?.estado)

        if (!nuevoEstado) return

        if (nuevoEstado === 'APROBADO') {
          continuar = false

          if (qrNotificadoRef.current) return
          qrNotificadoRef.current = true

          const pago = intento?.pago ?? null

          await onGuardado(
            'Pago QR confirmado correctamente por Libélula.',
            pago,
            { flujo: 'QR', recibo_generado: Boolean(pago?.recibo) }
          )

          setEstadoQr('APROBADO')
          onCerrar()
          return
        }

        if (nuevoEstado === 'RECHAZADO') {
          continuar = false
          setEstadoQr('RECHAZADO')
          setError(
            intento?.motivo_rechazo ||
            'El pago QR fue rechazado por la pasarela.'
          )
          return
        }

        if (nuevoEstado === 'VENCIDO') {
          continuar = false
          setEstadoQr('VENCIDO')
          setError('El código QR ha expirado. Por favor, genere un nuevo cobro.')
          return
        }

        setEstadoQr(nuevoEstado)
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
          3500
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
   * Recibe el intento de pago devuelto por payment-service y activa la
   * vista QR.
   *
   * @param {object} transaccion
   */
  const iniciarQr = (transaccion) => {
    qrNotificadoRef.current = false
    setTransaccionQr(transaccion)
    setEstadoQr(normalizarEstadoQr(transaccion.estado))
  }

  const qrPendiente = estadoQr === 'PENDIENTE'
  const qrAprobado = estadoQr === 'APROBADO' || estadoQr === 'CONFIRMADA'
  const qrVencido = estadoQr === 'VENCIDO' || estadoQr === 'EXPIRADA'

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

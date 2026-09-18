import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { useParams } from 'react-router-dom'

import {
  confirmarPagoQr,
  consultarPagoQr,
} from '../../services/pagoInternetService'

function PagoQrPublicPage() {
  const { token } = useParams()

  const [estado, setEstado] =
    useState('CARGANDO')

  const [transaccion, setTransaccion] =
    useState(null)

  const [mensaje, setMensaje] =
    useState('Validando código QR...')

  const procesadoRef = useRef(false)

  useEffect(() => {
    if (!token || procesadoRef.current) {
      return
    }

    procesadoRef.current = true

    async function procesarQr() {
      try {
        /*
         * Primero consultamos la operación.
         * Un simple GET nunca genera el pago.
         */
        const consulta =
          await consultarPagoQr(token)

        const datos =
          consulta.transaccion

        setTransaccion(datos)

        if (
          datos.estado === 'APROBADO'
        ) {
          setEstado('APROBADO')
          setMensaje(
            'Este pago ya fue confirmado anteriormente.'
          )
          return
        }

        if (
          datos.estado === 'VENCIDO'
        ) {
          setEstado('VENCIDO')
          setMensaje(
            'Este código QR ha vencido.'
          )
          return
        }

        if (
          datos.estado !== 'PENDIENTE'
        ) {
          setEstado(datos.estado)
          setMensaje(
            'Esta transacción ya no puede procesarse.'
          )
          return
        }

        setEstado('PROCESANDO')
        setMensaje(
          'Confirmando pago...'
        )

        /*
         * En esta simulación académica,
         * abrir el QR representa la
         * confirmación del proveedor.
         */
        const respuesta =
          await confirmarPagoQr(token)

        setEstado(
          respuesta.estado ||
            'APROBADO'
        )

        setMensaje(
          'Pago confirmado correctamente.'
        )
      } catch (error) {
        const estadoRespuesta =
          error.data?.estado

        if (
          estadoRespuesta ===
            'VENCIDO' ||
          error.status === 410
        ) {
          setEstado('VENCIDO')
          setMensaje(
            'Este código QR ha vencido.'
          )
          return
        }

        setEstado('ERROR')
        setMensaje(
          error.message ||
            'No se pudo procesar el pago QR.'
        )
      }
    }

    procesarQr()
  }, [token])

  const aprobado =
    estado === 'APROBADO'

  const vencido =
    estado === 'VENCIDO'

  const error =
    estado === 'ERROR'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">

        <div className="mb-5 text-5xl">
          {aprobado
            ? '✅'
            : vencido
              ? '⌛'
              : error
                ? '❌'
                : '💳'}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Dulce Bocado
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Pago mediante QR
        </p>

        {transaccion && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-5">

            <p className="text-sm text-gray-500">
              Monto
            </p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              Bs{' '}
              {Number(
                transaccion.monto
              ).toFixed(2)}
            </p>

            <p className="mt-4 break-all text-xs text-gray-400">
              {
                transaccion.referencia
              }
            </p>
          </div>
        )}

        <div
          className={`mt-6 rounded-xl p-4 text-sm font-medium ${
            aprobado
              ? 'bg-green-50 text-green-700'
              : vencido
                ? 'bg-amber-50 text-amber-700'
                : error
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
          }`}
        >
          {mensaje}
        </div>

        {aprobado && (
          <p className="mt-5 text-sm text-gray-500">
            El sistema registró el pago y
            generó el recibo automáticamente.
          </p>
        )}

        <div className="mt-8 border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-400">
            Simulación académica de pago QR.
          </p>
        </div>
      </div>
    </main>
  )
}

export default PagoQrPublicPage
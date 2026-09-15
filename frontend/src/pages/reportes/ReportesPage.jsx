import { useState } from 'react'

import {
  descargarReportePdf,
  enviarReporteCorreo,
  obtenerReporteInventario,
  obtenerReportePedidos,
  obtenerReporteVentas,
} from '../../services/reporteService'

function ReportesPage() {
  const [cargando, setCargando] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [destinatarios, setDestinatarios] = useState('')

  const limpiarMensajes = () => {
    setError(null)
    setMensaje(null)
  }

  const probarReporte = async (tipo) => {
    setCargando(tipo)
    setResultado(null)
    limpiarMensajes()

    try {
      let respuesta

      if (tipo === 'ventas') {
        respuesta = await obtenerReporteVentas()
      } else if (tipo === 'pedidos') {
        respuesta = await obtenerReportePedidos()
      } else {
        respuesta = await obtenerReporteInventario()
      }

      setResultado({
        tipo,
        status: respuesta.status,
        data: respuesta.data,
      })
    } catch (err) {
      setError({
        tipo,
        status: err.status || 0,
        message: err.message,
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const descargarPdf = async (tipo) => {
    setCargando(`pdf-${tipo}`)
    limpiarMensajes()

    try {
      await descargarReportePdf(tipo)

      setMensaje({
        tipo: 'exito',
        texto: `PDF de ${tipo} generado correctamente.`,
      })
    } catch (err) {
      setError({
        tipo,
        status: err.status || 0,
        message: err.message,
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const obtenerCorreos = () =>
    destinatarios
      .split(/[,;\n]+/)
      .map((correo) => correo.trim())
      .filter(Boolean)

  const enviarCorreo = async (tipo) => {
    limpiarMensajes()

    const correos = obtenerCorreos()

    if (correos.length === 0) {
      setError({
        tipo,
        status: 0,
        message: 'Debes ingresar al menos una dirección de correo.',
        data: null,
      })
      return
    }

    setCargando(`correo-${tipo}`)

    try {
      const respuesta = await enviarReporteCorreo(
        tipo,
        correos
      )

      setMensaje({
        tipo: 'exito',
        texto: respuesta.message,
        data: respuesta,
      })
    } catch (err) {
      setError({
        tipo,
        status: err.status || 0,
        message: err.message,
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const botonPrincipal =
    'rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60'

  const botonSecundario =
    'rounded-xl border border-pink-600 px-4 py-2.5 text-sm font-semibold text-pink-600 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60'

  const botonCorreo =
    'rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60'

  const tarjetaReporte = (
    tipo,
    titulo,
    descripcion
  ) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        {titulo}
      </h2>

      <p className="mt-1 min-h-[40px] text-sm text-slate-500">
        {descripcion}
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={cargando !== null}
          onClick={() => probarReporte(tipo)}
          className={`${botonPrincipal} w-full`}
        >
          {cargando === tipo
            ? 'Consultando...'
            : `Consultar ${titulo}`}
        </button>

        <button
          type="button"
          disabled={cargando !== null}
          onClick={() => descargarPdf(tipo)}
          className={`${botonSecundario} w-full`}
        >
          {cargando === `pdf-${tipo}`
            ? 'Generando PDF...'
            : 'Descargar PDF'}
        </button>

        <button
          type="button"
          disabled={cargando !== null}
          onClick={() => enviarCorreo(tipo)}
          className={`${botonCorreo} w-full`}
        >
          {cargando === `correo-${tipo}`
            ? 'Enviando...'
            : 'Enviar por correo'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reportes Generales
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Consulta, genera y envía reportes de Ventas,
          Pedidos e Inventario.
        </p>
      </div>

      {/* DESTINATARIOS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Envío por correo
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Puedes ingresar uno o varios correos separados por
          coma o punto y coma.
        </p>

        <label
          htmlFor="destinatarios"
          className="mt-4 block text-sm font-medium text-slate-700"
        >
          Destinatarios
        </label>

        <input
          id="destinatarios"
          type="text"
          value={destinatarios}
          onChange={(event) =>
            setDestinatarios(event.target.value)
          }
          placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
        />
      </div>

      {/* REPORTES */}
      <div className="grid gap-4 md:grid-cols-3">
        {tarjetaReporte(
          'ventas',
          'Ventas',
          'Consulta las ventas registradas y sus importes.'
        )}

        {tarjetaReporte(
          'pedidos',
          'Pedidos',
          'Consulta pedidos, pagos, saldos y entregas.'
        )}

        {tarjetaReporte(
          'inventario',
          'Inventario',
          'Consulta existencias de materias primas y productos.'
        )}
      </div>

      {/* MENSAJE EXITOSO */}
      {mensaje && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-bold text-green-700">
            Operación completada
          </h2>

          <p className="mt-1 text-sm text-green-700">
            {mensaje.texto}
          </p>

          {mensaje.data?.correos && (
            <p className="mt-2 text-sm text-green-700">
              Destinatarios:{' '}
              {mensaje.data.correos.join(', ')}
            </p>
          )}

          {mensaje.data?.archivo && (
            <p className="mt-1 text-sm text-green-700">
              Archivo: {mensaje.data.archivo}
            </p>
          )}
        </div>
      )}

      {/* RESULTADO DE CONSULTA */}
      {resultado && (
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Reporte generado
              </h2>

              <p className="text-sm text-slate-600">
                {resultado.data?.titulo || resultado.tipo}
              </p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              HTTP {resultado.status}
            </span>
          </div>

          {resultado.data?.resumen && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(
                resultado.data.resumen
              ).map(([clave, valor]) => (
                <div
                  key={clave}
                  className="rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {clave.replaceAll('_', ' ')}
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {String(valor)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Datos obtenidos
            </p>

            <pre className="max-h-[500px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(
                resultado.data,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold text-red-700">
            No se pudo completar la operación
          </h2>

          {error.status > 0 && (
            <p className="mt-2 text-sm text-red-700">
              HTTP {error.status}
            </p>
          )}

          <p className="mt-1 text-sm text-red-700">
            {error.message}
          </p>

          {error.data?.archivo && (
            <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
              <p className="font-semibold">
                El PDF sí fue generado y guardado.
              </p>

              <p>
                Archivo: {error.data.archivo}
              </p>

              <p>
                Ruta: {error.data.ruta_guardada}
              </p>
            </div>
          )}

          {error.data && !error.data.archivo && (
            <pre className="mt-4 max-h-[400px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-white">
              {JSON.stringify(
                error.data,
                null,
                2
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportesPage
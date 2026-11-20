import { useCallback, useEffect, useState } from 'react'
import { descargarPdfRecibo, listarRecibos } from '../../services/reciboService'
import ReciboDetalleModal from './ReciboDetalleModal'
import ReciboModal from './ReciboModal'

function numeroRecibo(recibo) {
  if (recibo?.numero) return recibo.numero
  const id = recibo?.id_recibo ?? recibo
  return `REC-${String(id || 0).padStart(6, '0')}`
}

function formatearFecha(fecha) {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function RecibosPage() {
  const [recibos, setRecibos] = useState([])
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [cargando, setCargando] = useState(false)
  const [descargandoId, setDescargandoId] = useState(null)
  const [error, setError] = useState('')

  const [modalNuevo, setModalNuevo] = useState(false)
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null)

  const cargarRecibos = useCallback(async () => {
    try {
      setCargando(true)
      setError('')

      const respuesta = await listarRecibos({
        buscar,
        estado,
        metodo_pago: metodoPago,
      })

      setRecibos(respuesta.recibos ?? [])
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los recibos.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, metodoPago])

  useEffect(() => {
    cargarRecibos()
  }, [estado, metodoPago, cargarRecibos])

  function manejarBusqueda(event) {
    event.preventDefault()
    cargarRecibos()
  }

  async function manejarDescargarPdf(recibo) {
    try {
      setDescargandoId(recibo.id_recibo)
      setError('')
      const nombre = `recibo-${numeroRecibo(recibo)}.pdf`
      await descargarPdfRecibo(recibo.id_recibo, nombre)
    } catch (err) {
      setError(err.message || 'No se pudo descargar el PDF.')
    } finally {
      setDescargandoId(null)
    }
  }

  async function manejarGuardado(recibo) {
    setModalNuevo(false)
    await cargarRecibos()

    if (recibo?.id_recibo) {
      setReciboSeleccionado(recibo.id_recibo)
    }
  }

  async function manejarActualizacion() {
    await cargarRecibos()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recibos Internos
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Control documental de cobros, generación de comprobantes, descarga PDF y anulación.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          Nuevo recibo
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <form
          onSubmit={manejarBusqueda}
          className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]"
        >
          <input
            type="text"
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            placeholder="Buscar por número, pago, cliente o CI/NIT..."
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />

          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value="EMITIDO">Emitidos</option>
            <option value="ANULADO">Anulados</option>
          </select>

          <select
            value={metodoPago}
            onChange={(event) => setMetodoPago(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">Todos los métodos</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="QR">QR</option>
          </select>

          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <Th>N° Recibo</Th>
                <Th>Operación / Pago</Th>
                <Th>Cliente</Th>
                <Th>Monto</Th>
                <Th>Método</Th>
                <Th>Estado</Th>
                <Th>Impresiones</Th>
                <Th>Emisión</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {cargando ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Cargando recibos...
                  </td>
                </tr>
              ) : recibos.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron recibos registrados.
                  </td>
                </tr>
              ) : (
                recibos.map((recibo) => {
                  const origenTipo = recibo.snapshot?.origen_tipo || (recibo.pago?.id_venta ? 'Venta' : 'Pedido')
                  const origenId = recibo.snapshot?.origen_id || (recibo.pago?.id_venta ?? recibo.pago?.id_pedido ?? '-')
                  const numImpresiones = recibo.cantidad_impresiones ?? 0

                  return (
                    <tr
                      key={recibo.id_recibo}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <Td>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {numeroRecibo(recibo)}
                        </span>
                      </Td>

                      <Td>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {origenTipo} #{origenId}
                          </div>

                          <div className="text-xs text-gray-500">
                            Pago #{recibo.id_pago || recibo.pago_id}
                          </div>
                        </div>
                      </Td>

                      <Td>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {recibo.nombre_cliente}
                          </div>

                          {recibo.ci_nit_cliente && (
                            <div className="text-xs text-gray-500">
                              CI/NIT: {recibo.ci_nit_cliente}
                            </div>
                          )}
                        </div>
                      </Td>

                      <Td>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Bs {Number(recibo.monto).toFixed(2)}
                        </span>
                      </Td>

                      <Td>
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {recibo.metodo_pago}
                        </span>
                      </Td>

                      <Td>
                        <Estado estado={recibo.estado} />
                      </Td>

                      <Td>
                        <span className="text-gray-600 dark:text-gray-300">
                          {numImpresiones} {numImpresiones === 1 ? 'vez' : 'veces'}
                        </span>
                      </Td>

                      <Td>
                        {formatearFecha(recibo.fecha_emision || recibo.emitido_at)}
                      </Td>

                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => manejarDescargarPdf(recibo)}
                            disabled={descargandoId === recibo.id_recibo}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Descargar documento PDF"
                          >
                            {descargandoId === recibo.id_recibo ? 'PDF...' : 'PDF'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReciboSeleccionado(recibo.id_recibo)}
                            className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
                          >
                            Ver
                          </button>
                        </div>
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReciboModal
        abierto={modalNuevo}
        onCerrar={() => setModalNuevo(false)}
        onGuardado={manejarGuardado}
      />

      <ReciboDetalleModal
        abierto={Boolean(reciboSeleccionado)}
        reciboId={reciboSeleccionado}
        onCerrar={() => setReciboSeleccionado(null)}
        onActualizado={manejarActualizacion}
      />
    </div>
  )
}

function Th({ children, className = '' }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 ${className}`}
    >
      {children}
    </th>
  )
}

function Td({ children, className = '' }) {
  return (
    <td
      className={`px-4 py-3.5 text-gray-700 dark:text-gray-300 ${className}`}
    >
      {children}
    </td>
  )
}

function Estado({ estado }) {
  const clases =
    estado === 'EMITIDO'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${clases}`}
    >
      {estado}
    </span>
  )
}

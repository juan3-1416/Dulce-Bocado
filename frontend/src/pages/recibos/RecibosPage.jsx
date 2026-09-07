import { useEffect, useState } from 'react'
import { listarRecibos } from '../../services/reciboService'
import ReciboDetalleModal from './ReciboDetalleModal'
import ReciboModal from './ReciboModal'

function numeroRecibo(id) {
  return `REC-${String(id).padStart(6, '0')}`
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
  const [error, setError] = useState('')

  const [modalNuevo, setModalNuevo] =
    useState(false)

  const [
    reciboSeleccionado,
    setReciboSeleccionado,
  ] = useState(null)

  useEffect(() => {
    cargarRecibos()
  }, [estado, metodoPago])

  async function cargarRecibos() {
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
      setError(
        err.message ||
          'No se pudieron cargar los recibos.'
      )
    } finally {
      setCargando(false)
    }
  }

  function manejarBusqueda(event) {
    event.preventDefault()
    cargarRecibos()
  }

  async function manejarGuardado(recibo) {
    setModalNuevo(false)

    await cargarRecibos()

    if (recibo?.id_recibo) {
      setReciboSeleccionado(
        recibo.id_recibo
      )
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
            Recibos
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generación, consulta, impresión y
            anulación de recibos internos.
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
            onChange={(event) =>
              setBuscar(event.target.value)
            }
            placeholder="Buscar por recibo, pago, cliente, CI/NIT o referencia..."
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />

          <select
            value={estado}
            onChange={(event) =>
              setEstado(event.target.value)
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">
              Todos los estados
            </option>

            <option value="EMITIDO">
              Emitidos
            </option>

            <option value="ANULADO">
              Anulados
            </option>
          </select>

          <select
            value={metodoPago}
            onChange={(event) =>
              setMetodoPago(event.target.value)
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">
              Todos los métodos
            </option>

            <option value="EFECTIVO">
              Efectivo
            </option>

            <option value="QR">
              QR
            </option>

            <option value="ONLINE">
              Online
            </option>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <Th>Recibo</Th>
                <Th>Pago / Venta</Th>
                <Th>Cliente</Th>
                <Th>Monto</Th>
                <Th>Método</Th>
                <Th>Estado</Th>
                <Th>Impresiones</Th>
                <Th>Emisión</Th>
                <Th>Acciones</Th>
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
                    No se encontraron recibos.
                  </td>
                </tr>
              ) : (
                recibos.map((recibo) => (
                  <tr
                    key={recibo.id_recibo}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <Td>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {numeroRecibo(
                          recibo.id_recibo
                        )}
                      </span>
                    </Td>

                    <Td>
                      <div>
                        <div>
                          Pago #{recibo.id_pago}
                        </div>

                        <div className="text-xs text-gray-500">
                          Venta #
                          {recibo.pago
                            ?.id_venta ?? '-'}
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
                            CI/NIT:{' '}
                            {recibo.ci_nit_cliente}
                          </div>
                        )}
                      </div>
                    </Td>

                    <Td>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Bs{' '}
                        {Number(
                          recibo.monto
                        ).toFixed(2)}
                      </span>
                    </Td>

                    <Td>
                      {recibo.metodo_pago}
                    </Td>

                    <Td>
                      <Estado
                        estado={recibo.estado}
                      />
                    </Td>

                    <Td>
                      {recibo.cantidad_impresiones}
                    </Td>

                    <Td>
                      {formatearFecha(
                        recibo.fecha_emision
                      )}
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          setReciboSeleccionado(
                            recibo.id_recibo
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Ver
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReciboModal
        abierto={modalNuevo}
        onCerrar={() =>
          setModalNuevo(false)
        }
        onGuardado={manejarGuardado}
      />

      <ReciboDetalleModal
        abierto={Boolean(
          reciboSeleccionado
        )}
        reciboId={reciboSeleccionado}
        onCerrar={() =>
          setReciboSeleccionado(null)
        }
        onActualizado={
          manejarActualizacion
        }
      />
    </div>
  )
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </th>
  )
}

function Td({ children }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
      {children}
    </td>
  )
}

function Estado({ estado }) {
  const clases =
    estado === 'EMITIDO'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${clases}`}
    >
      {estado}
    </span>
  )
}
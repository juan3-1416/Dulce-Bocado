import { useEffect, useMemo, useState } from 'react'
import {
  crearRecibo,
  obtenerCatalogosRecibo,
} from '../../services/reciboService'

function formatearFecha(fecha) {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function ReciboModal({
  abierto,
  onCerrar,
  onGuardado,
}) {
  const [pagos, setPagos] = useState([])
  const [idPago, setIdPago] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto) return

    cargarCatalogos()
  }, [abierto])

  async function cargarCatalogos() {
    try {
      setCargando(true)
      setError('')
      setIdPago('')

      const respuesta = await obtenerCatalogosRecibo()

      setPagos(respuesta.pagos ?? [])
    } catch (err) {
      setError(
        err.message ||
          'No se pudieron cargar los pagos disponibles.'
      )
    } finally {
      setCargando(false)
    }
  }

  const pagoSeleccionado = useMemo(
    () =>
      pagos.find(
        (pago) =>
          String(pago.id_pago) === String(idPago)
      ),
    [pagos, idPago]
  )

  async function manejarSubmit(event) {
    event.preventDefault()

    if (!idPago) {
      setError('Debe seleccionar un pago.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      const respuesta = await crearRecibo({
        id_pago: Number(idPago),
      })

      onGuardado?.(respuesta.recibo)
    } catch (err) {
      setError(
        err.message ||
          'No se pudo generar el recibo.'
      )
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Generar recibo
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Seleccione un pago registrado que todavía no tenga
              un recibo emitido.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={manejarSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Cargando pagos disponibles...
            </div>
          ) : pagos.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-5 text-center dark:border-gray-700">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                No existen pagos disponibles.
              </p>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Todos los pagos registrados ya tienen recibo emitido
                o no cumplen las condiciones necesarias.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="id_pago"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Pago
                </label>

                <select
                  id="id_pago"
                  value={idPago}
                  onChange={(event) =>
                    setIdPago(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">
                    Seleccione un pago
                  </option>

                  {pagos.map((pago) => (
                    <option
                      key={pago.id_pago}
                      value={pago.id_pago}
                    >
                      Pago #{pago.id_pago} - Venta #{pago.id_venta} -{' '}
                      {pago.nombre_cliente} - Bs{' '}
                      {Number(pago.monto).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {pagoSeleccionado && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                    Datos del pago
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Dato
                      etiqueta="Pago"
                      valor={`#${pagoSeleccionado.id_pago}`}
                    />

                    <Dato
                      etiqueta="Venta"
                      valor={`#${pagoSeleccionado.id_venta}`}
                    />

                    <Dato
                      etiqueta="Cliente"
                      valor={pagoSeleccionado.nombre_cliente}
                    />

                    <Dato
                      etiqueta="CI / NIT"
                      valor={
                        pagoSeleccionado.ci_nit_cliente ||
                        'No registrado'
                      }
                    />

                    <Dato
                      etiqueta="Monto"
                      valor={`Bs ${Number(
                        pagoSeleccionado.monto
                      ).toFixed(2)}`}
                    />

                    <Dato
                      etiqueta="Método"
                      valor={pagoSeleccionado.metodo_pago}
                    />

                    <Dato
                      etiqueta="Referencia"
                      valor={
                        pagoSeleccionado.referencia ||
                        'Sin referencia'
                      }
                    />

                    <Dato
                      etiqueta="Fecha de pago"
                      valor={formatearFecha(
                        pagoSeleccionado.fecha_pago
                      )}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando ||
                cargando ||
                !idPago ||
                pagos.length === 0
              }
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {guardando
                ? 'Generando...'
                : 'Generar recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {etiqueta}
      </p>

      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </div>
  )
}
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { listarProduccionesGateway, obtenerProduccionGateway } from '../../services/produccionGatewayService'
import { listarPresentaciones } from '../../services/presentacionService'
import { listarMateriasPrimas } from '../../services/catalogoMateriaPrimaService'
import { formatearCantidad } from '../../utils/formatters'

const ESTADOS = {
  EN_PROCESO: { texto: 'En proceso', clase: 'bg-amber-50 text-amber-800' },
  COMPLETADA: { texto: 'Completada', clase: 'bg-green-50 text-green-700' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700' },
}

function Estado({ valor }) {
  const estado = ESTADOS[valor] || { texto: valor || 'Desconocido', clase: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estado.clase}`}>{estado.texto}</span>
}

function fechaLocal(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleString('es-BO')
}

export default function ProduccionList() {
  const { tienePermiso } = useAuth()
  const location = useLocation()
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [producciones, setProducciones] = useState([])
  const [paginacion, setPaginacion] = useState({ page: 1, last_page: 1, total: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [detalleCargando, setDetalleCargando] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')
  const [presentacionesCatalogo, setPresentacionesCatalogo] = useState([])
  const [materiasPrimasCatalogo, setMateriasPrimasCatalogo] = useState([])

  const cargar = useCallback(async (signal) => {
    try {
      const respuesta = await listarProduccionesGateway(estado, pagina, { signal })
      if (signal?.aborted) return
      setProducciones(respuesta.producciones)
      setPaginacion(respuesta.pagination || { page: pagina, last_page: 1, total: respuesta.producciones.length })
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'No se pudo consultar Producción.')
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }, [estado, pagina])

  useEffect(() => {
    const controller = new AbortController()
    void cargar(controller.signal)
    return () => controller.abort()
  }, [cargar])

  useEffect(() => {
    let activo = true

    const cargarCatalogos = async () => {
      try {
        const [
          respuestaPresentaciones,
          respuestaMaterias,
        ] = await Promise.all([
          listarPresentaciones(),
          listarMateriasPrimas(),
        ])

        if (!activo) return

        setPresentacionesCatalogo(
          respuestaPresentaciones.presentaciones ?? [],
        )

        setMateriasPrimasCatalogo(
          respuestaMaterias.materias_primas ?? [],
        )
      } catch {
        if (!activo) return

        setPresentacionesCatalogo([])
        setMateriasPrimasCatalogo([])
      }
    }

    void cargarCatalogos()

    return () => {
      activo = false
    }
  }, [])

  const nombrePresentacion = (id) => {
    const presentacion =
      presentacionesCatalogo.find(
        (item) =>
          Number(item.presentacion_id) ===
          Number(id),
      )

    if (!presentacion) {
      return `Presentación #${id}`
    }

    const producto =
      presentacion.producto?.nombre?.trim()

    const nombre =
      presentacion.nombre?.trim()

    if (producto && nombre) {
      return `${producto} — ${nombre}`
    }

    return (
      nombre ||
      producto ||
      `Presentación #${id}`
    )
  }

  const nombreMateriaPrima = (id) => {
    const materia =
      materiasPrimasCatalogo.find(
        (item) =>
          Number(item.id_materia_prima) ===
          Number(id),
      )

    return (
      materia?.nombre?.trim() ||
      `Materia prima #${id}`
    )
  }

  const abrirDetalle = async (id) => {
    setDetalle(null)
    setErrorDetalle('')
    setDetalleCargando(true)
    try {
      setDetalle(await obtenerProduccionGateway(id))
    } catch (err) {
      setErrorDetalle(err.message || 'No se pudo consultar el detalle.')
    } finally {
      setDetalleCargando(false)
    }
  }

  const actualizar = () => {
    setCargando(true)
    void cargar()
    if (detalle) void abrirDetalle(detalle.id_produccion)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Producción</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta elaboraciones y el resultado confirmado por Inventario.</p>
        </div>
        {tienePermiso('produccion.crear') && <Link to="/produccion/crear" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">Registrar producción</Link>}
      </div>

      {location.state?.aviso && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{location.state.aviso}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="text-sm font-medium text-gray-700">Estado
          <select value={estado} onChange={(evento) => { setEstado(evento.target.value); setPagina(1); setDetalle(null) }} className="mt-1 block min-w-44 rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
            <option value="">Todos</option>
            <option value="COMPLETADA">Completada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </label>
        <button type="button" onClick={actualizar} disabled={cargando} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600 disabled:opacity-50">Actualizar</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>
            <th scope="col" className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Producción</th>
            <th scope="col" className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Presentación</th>
            <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-gray-900">Unidades</th>
            <th scope="col" className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
            <th scope="col" className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
            <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-gray-900">Detalle</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? <tr><td colSpan="6" className="px-5 py-10 text-center text-sm text-gray-500">Cargando producciones...</td></tr>
              : error ? <tr><td colSpan="6" className="px-5 py-10 text-center text-sm text-gray-500">Listado no disponible.</td></tr>
                : producciones.length === 0 ? <tr><td colSpan="6" className="px-5 py-10 text-center text-sm text-gray-500">No hay producciones para este estado.</td></tr>
                  : producciones.map((item) => <tr key={item.id_produccion}>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">#{item.id_produccion}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{nombrePresentacion(item.presentacion_id)}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-700">{formatearCantidad(item.cantidad)}</td>
                    <td className="px-5 py-4"><Estado valor={item.estado} /></td>
                    <td className="px-5 py-4 text-sm text-gray-600">{fechaLocal(item.created_at)}</td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => void abrirDetalle(item.id_produccion)} className="text-sm font-semibold text-pink-700 hover:text-pink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">Ver detalle</button></td>
                  </tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{paginacion.total} producciones · página {paginacion.page} de {paginacion.last_page}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPagina((valor) => Math.max(1, valor - 1))} disabled={cargando || pagina <= 1} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">Anterior</button>
          <button type="button" onClick={() => setPagina((valor) => valor + 1)} disabled={cargando || pagina >= paginacion.last_page} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      {(detalleCargando || errorDetalle || detalle) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detalle-produccion-titulo"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h2
                  id="detalle-produccion-titulo"
                  className="text-xl font-semibold text-gray-900"
                >
                  {detalle
                    ? `Producción #${detalle.id_produccion}`
                    : 'Detalle de producción'}
                </h2>

                {detalle?.operacion_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Operación {detalle.operacion_id}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setDetalle(null)
                  setErrorDetalle('')
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            {detalleCargando ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Cargando detalle...
              </p>
            ) : errorDetalle ? (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {errorDetalle}
              </p>
            ) : detalle ? (
              <>
                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-500">
                      Estado
                    </span>
                    <div className="mt-1">
                      <Estado valor={detalle.estado} />
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">
                      Producto / presentación
                    </span>
                    <p className="mt-1 font-medium text-gray-900">
                      {nombrePresentacion(
                        detalle.presentacion_id,
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">
                      Unidades
                    </span>
                    <p className="mt-1 font-medium text-gray-900">
                      {formatearCantidad(detalle.cantidad)}
                    </p>
                  </div>
                </div>

                {detalle.receta_id && (
                  <p className="mt-4 text-sm text-gray-600">
                    Receta interna: #{detalle.receta_id}
                  </p>
                )}

                {detalle.estado === 'EN_PROCESO' && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    Inventario aún no confirmó el asiento.
                    Estas unidades no se consideran terminadas.
                  </p>
                )}

                {detalle.codigo_rechazo && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    Motivo del rechazo: {detalle.codigo_rechazo}
                  </p>
                )}

                {detalle.observaciones && (
                  <p className="mt-4 text-sm text-gray-700">
                    Observaciones: {detalle.observaciones}
                  </p>
                )}

                <h3 className="mt-6 text-sm font-semibold text-gray-900">
                  Consumo previsto al registrar
                </h3>

                {(detalle.consumo_snapshot?.ingredientes || []).length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No hay ingredientes registrados en el snapshot.
                  </p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                            Materia prima
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                            Cantidad
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {(detalle.consumo_snapshot?.ingredientes || []).map(
                          (insumo) => (
                            <tr key={insumo.materia_prima_id}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {nombreMateriaPrima(
                                  insumo.materia_prima_id,
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-sm text-gray-700">
                                {formatearCantidad(insumo.cantidad)} {insumo.unidad}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  actualizarEstado,
  listarProducciones,
  obtenerProduccion,
} from '../../services/produccionService'
import CompletarProduccionModal from './CompletarProduccionModal'

const ESTADO_COLORS = {
  PROGRAMADA: 'bg-blue-100 text-blue-700',
  EN_PROCESO: 'bg-yellow-100 text-yellow-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-700',
  default: 'bg-gray-100 text-gray-700',
}

const ESTADO_TEXTO = {
  PROGRAMADA: 'Programada',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

function formatearFecha(valor) {
  if (!valor) return '—'

  const fecha = String(valor).split('T')[0]

  if (!fecha || fecha === 'null') return '—'

  const [anio, mes, dia] = fecha.split('-')

  if (!anio || !mes || !dia) return fecha

  return `${dia}/${mes}/${anio}`
}

function formatearNumero(valor) {
  const numero = Number.parseFloat(valor)

  if (!Number.isFinite(numero)) return '0'

  return numero.toFixed(2)
}

function leerRelacion(referencia, clave) {
  if (!referencia) return null

  return referencia[clave] ?? referencia[clave.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase())]
}

function ProduccionList() {
  const navigate = useNavigate()
  const { tienePermiso } = useAuth()
  const puedeCrear = tienePermiso('produccion.crear')
  const puedeGestionar = tienePermiso('produccion.gestionar')

  const [producciones, setProducciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [detalleProduccion, setDetalleProduccion] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [modalProduccion, setModalProduccion] = useState(null)
  const [modoModal, setModoModal] = useState('completar')
  const [filtros, setFiltros] = useState({
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
  })

  const cargarProducciones = useCallback(async () => {
    try {
      setCargando(true)
      setError('')

      const respuesta = await listarProducciones(filtros)
      const lista = Array.isArray(respuesta)
        ? respuesta
        : respuesta?.producciones ?? respuesta?.data ?? []

      setProducciones(lista)
    } catch (err) {
      setProducciones([])
      setError(err.message || 'No se pudieron cargar las órdenes de producción.')
    } finally {
      setCargando(false)
    }
  }, [filtros])

  useEffect(() => {
    cargarProducciones()
  }, [cargarProducciones])

  const manejarCambioFiltro = (evento) => {
    const { name, value } = evento.target

    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const limpiarFiltros = () => {
    setFiltros({
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
    })
  }

  const obtenerNombreProducto = (produccion) => {
    const productoPresentacion = leerRelacion(produccion, 'producto_presentacion')
      ?? leerRelacion(produccion, 'productoPresentacion')
      ?? {}

    const producto = leerRelacion(productoPresentacion, 'producto') ?? {}

    const nombreProducto = producto.nombre || 'Producto sin nombre'
    const nombrePresentacion = productoPresentacion.nombre || 'Presentación'

    return `${nombreProducto} / ${nombrePresentacion}`
  }

  const obtenerCantidadEsperada = (produccion) => {
    const detalle = Array.isArray(produccion.detalles) ? produccion.detalles[0] : null

    return detalle?.cantidad_esperada ?? detalle?.cantidadEsperada ?? 0
  }

  const obtenerCantidadProducida = (produccion) => {
    const detalle = Array.isArray(produccion.detalles) ? produccion.detalles[0] : null

    return detalle?.cantidad_producida ?? detalle?.cantidadProducida ?? 0
  }

  const obtenerClaseEstado = (estado) => ESTADO_COLORS[estado] ?? ESTADO_COLORS.default

  const obtenerTextoEstado = (estado) => ESTADO_TEXTO[estado] ?? estado ?? 'Sin estado'

  const abrirDetalle = async (produccion) => {
    try {
      setCargandoDetalle(true)
      setError('')

      const respuesta = await obtenerProduccion(produccion.id_produccion)
      const detalle = respuesta?.produccion ?? respuesta

      setDetalleProduccion(detalle)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el detalle de la producción.')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const manejarCambioEstado = async (produccion, nuevoEstado) => {
    try {
      const payload = { estado: nuevoEstado }

      if (nuevoEstado === 'COMPLETADA') {
        const cantidadEsperada = Number(obtenerCantidadEsperada(produccion) || 0)
        payload.unidades_producidas = cantidadEsperada
      }

      await actualizarEstado(produccion.id_produccion, payload)
      await cargarProducciones()
      setDetalleProduccion(null)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado de la producción.')
    }
  }

  const abrirModalCompletar = (produccion) => {
    setModalProduccion(produccion)
    setModoModal('completar')
  }

  const abrirModalCancelar = (produccion) => {
    setModalProduccion(produccion)
    setModoModal('cancelar')
  }

  const confirmarModal = async (idProduccion, datos) => {
    await actualizarEstado(idProduccion, datos)
    await cargarProducciones()
    setDetalleProduccion(null)
    setModalProduccion(null)
  }

  const confirmarCancelacion = async (idProduccion, datos) => {
    await actualizarEstado(idProduccion, { ...datos, estado: 'CANCELADA' })
    await cargarProducciones()
    setDetalleProduccion(null)
    setModalProduccion(null)
  }

  const resumen = useMemo(() => ({
    total: producciones.length,
    programadas: producciones.filter((item) => item.estado === 'PROGRAMADA').length,
    enProceso: producciones.filter((item) => item.estado === 'EN_PROCESO').length,
    completadas: producciones.filter((item) => item.estado === 'COMPLETADA').length,
  }), [producciones])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producción</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consulta y gestiona las órdenes de producción programadas.
          </p>
        </div>

        {puedeCrear && (
          <button
            type="button"
            onClick={() => navigate('/produccion/crear')}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
          >
            Nueva Producción
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Estado
            </label>
            <select
              name="estado"
              value={filtros.estado}
              onChange={manejarCambioFiltro}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="">Todos</option>
              <option value="PROGRAMADA">PROGRAMADA</option>
              <option value="EN_PROCESO">EN_PROCESO</option>
              <option value="COMPLETADA">COMPLETADA</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Fecha desde
            </label>
            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={manejarCambioFiltro}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Fecha hasta
            </label>
            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={manejarCambioFiltro}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Resultados</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{resumen.total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase text-blue-700">Programadas</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{resumen.programadas}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-semibold uppercase text-yellow-700">En proceso</p>
          <p className="mt-1 text-2xl font-bold text-yellow-800">{resumen.enProceso}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Completadas</p>
          <p className="mt-1 text-2xl font-bold text-green-800">{resumen.completadas}</p>
        </div>
      </div>

      {detalleProduccion && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle</p>
              <h2 className="text-lg font-bold text-slate-900">
                {obtenerNombreProducto(detalleProduccion)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setDetalleProduccion(null)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Orden</p>
              <p className="font-semibold text-slate-800">#{detalleProduccion.id_produccion}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Cantidad esperada</p>
              <p className="font-semibold text-slate-800">{formatearNumero(obtenerCantidadEsperada(detalleProduccion))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Unidades producidas</p>
              <p className="font-semibold text-slate-800">{formatearNumero(obtenerCantidadProducida(detalleProduccion))}</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">Cargando órdenes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Producto / Presentación</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">Cantidad esperada</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">Unidades producidas</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Responsable</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {producciones.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-sm text-gray-500">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  producciones.map((produccion) => (
                    <tr key={produccion.id_produccion} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">#{produccion.id_produccion}</p>
                        <p className="text-sm text-gray-700">{obtenerNombreProducto(produccion)}</p>
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-gray-700">
                        {formatearNumero(obtenerCantidadEsperada(produccion))}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-gray-700">
                        {formatearNumero(obtenerCantidadProducida(produccion))}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${obtenerClaseEstado(produccion.estado)}`}>
                          {obtenerTextoEstado(produccion.estado)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatearFecha(produccion.fecha_produccion)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {produccion.usuario?.nombre || 'Sin responsable'}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(produccion)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Ver detalle
                          </button>

                          {puedeGestionar && (
                            <>
                              {produccion.estado === 'PROGRAMADA' && (
                                <button
                                  type="button"
                                  onClick={() => manejarCambioEstado(produccion, 'EN_PROCESO')}
                                  className="rounded border border-yellow-200 px-2 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
                                >
                                  Avanzar estado
                                </button>
                              )}

                              {produccion.estado === 'EN_PROCESO' && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalCompletar(produccion)}
                                  className="rounded border border-green-200 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                                >
                                  Completar
                                </button>
                              )}

                              {(produccion.estado === 'PROGRAMADA' || produccion.estado === 'EN_PROCESO') && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalCancelar(produccion)}
                                  className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  Cancelar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cargandoDetalle && (
        <div className="text-sm text-gray-500">Cargando detalle...</div>
      )}

      <CompletarProduccionModal
        isOpen={Boolean(modalProduccion)}
        produccion={modalProduccion}
        modo={modoModal}
        onClose={() => setModalProduccion(null)}
        onConfirm={confirmarModal}
        onCancel={confirmarCancelacion}
      />
    </section>
  )
}

export default ProduccionList

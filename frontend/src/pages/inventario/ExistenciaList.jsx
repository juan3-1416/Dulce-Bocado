import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { listarAlmacenes, listarExistencias } from '../../services/inventarioConsultaService'

const TIPOS = {
  MATERIA_PRIMA: 'Materia prima',
  PRESENTACION: 'Producto terminado',
}

export default function ExistenciaList() {
  const { id } = useParams()
  const almacenId = Number(id)
  const [almacen, setAlmacen] = useState(null)
  const [existencias, setExistencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [claveCargada, setClaveCargada] = useState('')
  const [error, setError] = useState('')
  const [errorFiltro, setErrorFiltro] = useState('')
  const [tipo, setTipo] = useState('')
  const [articuloId, setArticuloId] = useState('')
  const [filtros, setFiltros] = useState({})
  const idValido = Number.isSafeInteger(almacenId) && almacenId > 0
  const claveConsulta = `${almacenId}:${JSON.stringify(filtros)}`
  const mostrandoCarga = cargando || claveCargada !== claveConsulta

  const cargar = useCallback(async (signal) => {
    try {
      const [almacenes, saldos] = await Promise.all([
        listarAlmacenes({ signal }),
        listarExistencias({ almacen_id: almacenId, ...filtros }, { signal }),
      ])
      if (signal?.aborted) return

      const encontrado = almacenes.find((item) => item.id_almacen === almacenId)
      if (!encontrado) {
        setError('El almacén solicitado no existe.')
        setAlmacen(null)
        setExistencias([])
        return
      }

      setAlmacen(encontrado)
      setExistencias(saldos)
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'No se pudieron cargar las existencias.')
      }
    } finally {
      if (!signal?.aborted) {
        setCargando(false)
        setClaveCargada(claveConsulta)
      }
    }
  }, [almacenId, filtros, claveConsulta])

  useEffect(() => {
    if (!idValido) return undefined
    const controller = new AbortController()
    void cargar(controller.signal)
    return () => controller.abort()
  }, [cargar, idValido])

  const aplicarFiltros = (evento) => {
    evento.preventDefault()
    const idLimpio = articuloId.trim()
    if (idLimpio && (!tipo || !/^[1-9]\d*$/.test(idLimpio) || !Number.isSafeInteger(Number(idLimpio)))) {
      setErrorFiltro('Selecciona un tipo y un ID de artículo válido.')
      return
    }
    setErrorFiltro('')
    setCargando(true)
    setError('')
    setFiltros({
      ...(tipo ? { tipo_articulo: tipo } : {}),
      ...(idLimpio ? { articulo_id: idLimpio } : {}),
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Existencias en {almacen?.nombre || 'Almacén'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Consulta el saldo por artículo en este almacén.
          </p>
        </div>
        <Link
          to="/almacenes"
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          ← Volver a almacenes
        </Link>
      </div>

      <form onSubmit={aplicarFiltros} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="tipoArticulo" className="mb-1 block text-sm font-medium text-gray-700">Tipo de artículo</label>
          <select id="tipoArticulo" value={tipo} onChange={(evento) => setTipo(evento.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="MATERIA_PRIMA">Materia prima</option>
            <option value="PRESENTACION">Producto terminado</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="articuloId" className="mb-1 block text-sm font-medium text-gray-700">ID del artículo</label>
          <input id="articuloId" inputMode="numeric" value={articuloId} onChange={(evento) => setArticuloId(evento.target.value)} placeholder="Todos" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700">Consultar</button>
      </form>
      {errorFiltro && <p role="alert" className="text-sm text-red-700">{errorFiltro}</p>}

      {!idValido && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          La referencia del almacén no es válida.
        </p>
      )}

      {idValido && error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => {
            setCargando(true)
            setError('')
            void cargar()
          }} className="mt-2 text-sm font-semibold text-red-700 underline">Reintentar existencias</button>
        </div>
      )}

      {!idValido ? null : mostrandoCarga ? (
        <div role="status" className="flex items-center justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-pink-600" />
          <span className="sr-only">Cargando existencias</span>
        </div>
      ) : error ? null : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Artículo</th>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th scope="col" className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {existencias.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                    {filtros.articulo_id
                      ? 'Sin fila de existencia para este artículo; saldo 0.'
                      : 'No hay existencias registradas en este almacén.'}
                  </td>
                </tr>
              ) : existencias.map((existencia) => (
                <tr key={`${existencia.almacen_id}-${existencia.tipo_articulo}-${existencia.articulo_id}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Artículo #{existencia.articulo_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{TIPOS[existencia.tipo_articulo] || existencia.tipo_articulo}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    {existencia.cantidad} <span className="font-normal text-gray-500">{existencia.unidad}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

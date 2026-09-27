import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  enviarProductoAMostrador,
  listarExistenciasPorAlmacen,
  obtenerAlmacen,
} from '../../services/inventarioService'

export default function ExistenciaList() {
  const { id } = useParams()

  const [almacen, setAlmacen] = useState(null)
  const [existencias, setExistencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')

  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [cantidadEnviar, setCantidadEnviar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)

      const [almacenData, existenciasData] = await Promise.all([
        obtenerAlmacen(id),
        listarExistenciasPorAlmacen(id),
      ])

      setAlmacen(almacenData)
      setExistencias(
        Array.isArray(existenciasData)
          ? existenciasData
          : []
      )
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar las existencias.'
      )
    } finally {
      setCargando(false)
    }
  }

  const esAlmacenProduccion =
    Number(id) === 2 ||
    almacen?.nombre?.trim().toLowerCase() ===
      'producción'

  const renderItemNombre = (existencia) => {
    if (existencia.producto_presentacion) {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {
              existencia.producto_presentacion
                .producto?.nombre
            }
          </div>

          <div className="text-gray-500">
            {existencia.producto_presentacion
              .presentacion?.nombre ||
              existencia.producto_presentacion
                .nombre ||
              'Sin presentación'}
          </div>
        </div>
      )
    }

    if (existencia.materia_prima) {
      return (
        <div className="font-medium text-gray-900">
          {existencia.materia_prima.nombre}
        </div>
      )
    }

    return 'Desconocido'
  }

  const renderTipo = (existencia) => {
    if (existencia.producto_presentacion) {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          Producto Terminado
        </span>
      )
    }

    if (existencia.materia_prima) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          Materia Prima
        </span>
      )
    }

    return '-'
  }

  const renderUnidad = (existencia) => {
    if (existencia.producto_presentacion) {
      return 'unidades'
    }

    if (existencia.materia_prima) {
      return (
        existencia.materia_prima.unidad_medida ||
        'g'
      )
    }

    return ''
  }

  const abrirModal = (existencia) => {
    setProductoSeleccionado(existencia)
    setCantidadEnviar('')
    setErrorModal('')
    setMensaje('')
  }

  const cerrarModal = () => {
    if (guardando) return

    setProductoSeleccionado(null)
    setCantidadEnviar('')
    setErrorModal('')
  }

  const manejarEnvio = async (evento) => {
    evento.preventDefault()

    if (!productoSeleccionado) {
      return
    }

    const cantidad =
      Number(cantidadEnviar)

    const stockDisponible =
      Number(productoSeleccionado.cantidad)

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      setErrorModal(
        'La cantidad debe ser un número entero mayor a cero.'
      )
      return
    }

    if (cantidad > stockDisponible) {
      setErrorModal(
        `No puedes enviar más de ${stockDisponible} unidad(es).`
      )
      return
    }

    try {
      setGuardando(true)
      setErrorModal('')

      const respuesta =
        await enviarProductoAMostrador(
          id,
          {
            id_producto_presentacion:
              productoSeleccionado.id_producto_presentacion,
            cantidad,
          }
        )

      setProductoSeleccionado(null)
      setCantidadEnviar('')

      setMensaje(
        respuesta?.message ||
          'Producto enviado a Mostrador correctamente.'
      )

      await cargarDatos()
    } catch (err) {
      const errores =
        err?.data?.errors

      if (errores) {
        const primerError =
          Object.values(errores)[0]

        if (
          Array.isArray(primerError) &&
          primerError.length > 0
        ) {
          setErrorModal(primerError[0])
          return
        }
      }

      setErrorModal(
        err.message ||
          'No se pudo enviar el producto a Mostrador.'
      )
    } finally {
      setGuardando(false)
    }
  }

  const nombreProductoModal =
    productoSeleccionado
      ?.producto_presentacion
      ?.producto?.nombre ||
    'Producto'

  const nombrePresentacionModal =
    productoSeleccionado
      ?.producto_presentacion
      ?.presentacion?.nombre ||
    productoSeleccionado
      ?.producto_presentacion
      ?.nombre ||
    ''

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Existencias en{' '}
              {almacen
                ? almacen.nombre
                : 'Almacén'}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {almacen?.descripcion}
            </p>
          </div>

          <div className="mt-4 sm:ml-4 sm:mt-0">
            <Link
              to="/almacenes"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              &larr; Volver a Almacenes
            </Link>
          </div>
        </div>

        {esAlmacenProduccion && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">
              Los productos terminados disponibles en
              Producción pueden enviarse al almacén
              Mostrador.
            </p>
          </div>
        )}

        {mensaje && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {mensaje}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Ítem
                  </th>

                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Tipo
                  </th>

                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Cantidad Disponible
                  </th>

                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Última Actualización
                  </th>

                  {esAlmacenProduccion && (
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {existencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        esAlmacenProduccion
                          ? 5
                          : 4
                      }
                      className="py-8 text-center text-sm text-gray-500"
                    >
                      No hay existencias registradas en este almacén.
                    </td>
                  </tr>
                ) : (
                  existencias.map((existencia) => {
                    const esProductoTerminado =
                      Boolean(
                        existencia.producto_presentacion
                      )

                    const tieneStock =
                      Number(existencia.cantidad) > 0

                    return (
                      <tr
                        key={
                          existencia.id_inventario
                        }
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          {renderItemNombre(
                            existencia
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {renderTipo(
                            existencia
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">
                          {Number(
                            existencia.cantidad
                          ).toLocaleString(
                            'es-BO',
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            }
                          )}{' '}
                          <span className="font-normal text-gray-500">
                            {renderUnidad(
                              existencia
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500">
                          {existencia.ultima_actualizacion
                            ? new Date(
                                existencia.ultima_actualizacion
                              ).toLocaleString(
                                'es-BO'
                              )
                            : '-'}
                        </td>

                        {esAlmacenProduccion && (
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm sm:pr-6">
                            {esProductoTerminado &&
                            tieneStock ? (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirModal(
                                    existencia
                                  )
                                }
                                className="inline-flex items-center rounded-lg bg-pink-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-pink-700"
                              >
                                Enviar a mostrador
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                —
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {productoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                Enviar a Mostrador
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Trasladar producto terminado desde Producción.
              </p>
            </div>

            <form onSubmit={manejarEnvio}>
              <div className="space-y-5 p-6">
                {errorModal && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">
                      {errorModal}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Producto
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {nombreProductoModal}
                  </p>

                  <p className="text-sm text-gray-500">
                    {nombrePresentacionModal}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <span className="text-sm text-blue-700">
                    Stock disponible en Producción
                  </span>

                  <span className="font-bold text-blue-900">
                    {Number(
                      productoSeleccionado.cantidad
                    ).toLocaleString('es-BO', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    unidades
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="cantidadEnviar"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Cantidad a enviar
                  </label>

                  <input
                    id="cantidadEnviar"
                    type="number"
                    min="1"
                    step="1"
                    max={Math.floor(
                      Number(
                        productoSeleccionado.cantidad
                      )
                    )}
                    required
                    autoFocus
                    value={cantidadEnviar}
                    onChange={(evento) =>
                      setCantidadEnviar(
                        evento.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">
                      Origen
                    </span>

                    <span className="font-semibold text-gray-900">
                      Producción
                    </span>
                  </div>

                  <div className="my-2 text-center text-gray-400">
                    ↓
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">
                      Destino
                    </span>

                    <span className="font-semibold text-gray-900">
                      Mostrador
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    !cantidadEnviar
                  }
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? 'Enviando...'
                    : 'Enviar a mostrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
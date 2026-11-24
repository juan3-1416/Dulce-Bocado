import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  listarAlmacenes,
  listarExistencias,
} from '../../services/inventarioConsultaService'

import {
  listarPresentaciones,
} from '../../services/presentacionService'

import {
  listarMateriasPrimas,
} from '../../services/catalogoMateriaPrimaService'

import { formatearCantidad } from '../../utils/formatters'

const TIPOS = {
  MATERIA_PRIMA: 'Materia prima',
  PRESENTACION: 'Producto terminado',
}

export default function ExistenciaList() {
  const { id } = useParams()

  const almacenId =
    Number(id)

  const [almacen, setAlmacen] =
    useState(null)

  const [
    existencias,
    setExistencias,
  ] = useState([])

  const [
    presentaciones,
    setPresentaciones,
  ] = useState([])

  const [
    materiasPrimas,
    setMateriasPrimas,
  ] = useState([])

  const [cargando, setCargando] =
    useState(true)

  const [
    claveCargada,
    setClaveCargada,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [
    errorFiltro,
    setErrorFiltro,
  ] = useState('')

  const [tipo, setTipo] =
    useState('')

  const [
    articuloId,
    setArticuloId,
  ] = useState('')

  const [filtros, setFiltros] =
    useState({})

  const idValido =
    Number.isSafeInteger(
      almacenId,
    ) &&
    almacenId > 0

  const claveConsulta =
    `${almacenId}:${JSON.stringify(
      filtros,
    )}`

  const mostrandoCarga =
    cargando ||
    claveCargada !==
      claveConsulta

  /*
   * Catálogo solo se usa para transformar
   * IDs técnicos en nombres legibles.
   */
  useEffect(() => {
    let activo = true

    const cargarCatalogo =
      async () => {
        const [
          respuestaPresentaciones,
          respuestaMaterias,
        ] =
          await Promise.allSettled([
            listarPresentaciones(),
            listarMateriasPrimas(),
          ])

        if (!activo) return

        if (
          respuestaPresentaciones.status ===
          'fulfilled'
        ) {
          setPresentaciones(
            respuestaPresentaciones
              .value
              ?.presentaciones ??
              [],
          )
        } else {
          setPresentaciones([])
        }

        if (
          respuestaMaterias.status ===
          'fulfilled'
        ) {
          setMateriasPrimas(
            respuestaMaterias
              .value
              ?.materias_primas ??
              [],
          )
        } else {
          setMateriasPrimas([])
        }
      }

    void cargarCatalogo()

    return () => {
      activo = false
    }
  }, [])

  const cargar =
    useCallback(
      async (signal) => {
        try {
          const [
            almacenes,
            saldos,
          ] =
            await Promise.all([
              listarAlmacenes({
                signal,
              }),

              listarExistencias(
                {
                  almacen_id:
                    almacenId,
                  ...filtros,
                },
                {
                  signal,
                },
              ),
            ])

          if (
            signal?.aborted
          ) {
            return
          }

          const encontrado =
            almacenes.find(
              (item) =>
                Number(
                  item.id_almacen,
                ) ===
                almacenId,
            )

          if (!encontrado) {
            setError(
              'El almacén solicitado no existe.',
            )

            setAlmacen(null)
            setExistencias([])

            return
          }

          setAlmacen(
            encontrado,
          )

          setExistencias(
            saldos,
          )

          setError('')
        } catch (err) {
          if (
            err.name !==
            'AbortError'
          ) {
            setError(
              err.message ||
                'No se pudieron cargar las existencias.',
            )
          }
        } finally {
          if (
            !signal?.aborted
          ) {
            setCargando(false)

            setClaveCargada(
              claveConsulta,
            )
          }
        }
      },
      [
        almacenId,
        filtros,
        claveConsulta,
      ],
    )

  useEffect(() => {
    if (!idValido) {
      return undefined
    }

    let controller
    const actualizar = () => {
      controller?.abort()
      controller = new AbortController()
      void cargar(controller.signal)
    }
    actualizar()
    window.addEventListener('focus', actualizar)
    window.addEventListener('inventario:actualizado', actualizar)
    return () => {
      controller?.abort()
      window.removeEventListener('focus', actualizar)
      window.removeEventListener('inventario:actualizado', actualizar)
    }
  }, [
    cargar,
    idValido,
  ])

  const nombrePresentacion = (
    idPresentacion,
  ) => {
    const presentacion =
      presentaciones.find(
        (item) =>
          Number(
            item.presentacion_id,
          ) ===
          Number(
            idPresentacion,
          ),
      )

    if (!presentacion) {
      return `Presentación #${idPresentacion}`
    }

    const producto =
      presentacion.producto
        ?.nombre?.trim()

    const nombre =
      presentacion.nombre
        ?.trim()

    if (
      producto &&
      nombre
    ) {
      return `${producto} — ${nombre}`
    }

    return (
      nombre ||
      producto ||
      `Presentación #${idPresentacion}`
    )
  }

  const nombreMateriaPrima = (
    idMateria,
  ) => {
    const materia =
      materiasPrimas.find(
        (item) =>
          Number(
            item.id_materia_prima,
          ) ===
          Number(idMateria),
      )

    return (
      materia?.nombre?.trim() ||
      `Materia prima #${idMateria}`
    )
  }

  const nombreArticulo = (
    tipoArticulo,
    idArticulo,
  ) =>
    tipoArticulo ===
    'PRESENTACION'
      ? nombrePresentacion(
          idArticulo,
        )
      : nombreMateriaPrima(
          idArticulo,
        )

  const opcionesArticulo =
    tipo === 'PRESENTACION'
      ? presentaciones.map(
          (item) => ({
            id:
              item.presentacion_id,

            nombre:
              nombrePresentacion(
                item.presentacion_id,
              ),
          }),
        )
      : tipo ===
          'MATERIA_PRIMA'
        ? materiasPrimas.map(
            (item) => ({
              id:
                item.id_materia_prima,

              nombre:
                item.nombre,
            }),
          )
        : []

  const aplicarFiltros = (
    evento,
  ) => {
    evento.preventDefault()

    setErrorFiltro('')
    setCargando(true)
    setError('')

    setFiltros({
      ...(tipo
        ? {
            tipo_articulo:
              tipo,
          }
        : {}),

      ...(articuloId
        ? {
            articulo_id:
              articuloId,
          }
        : {}),
    })
  }

  const limpiarFiltros = () => {
    setTipo('')
    setArticuloId('')
    setErrorFiltro('')
    setError('')
    setCargando(true)
    setFiltros({})
  }

  if (!idValido) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Existencias
        </h1>

        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          El almacén solicitado no es válido.
        </p>

        <Link
          to="/almacenes"
          className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
        >
          ← Volver a almacenes
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Existencias en{' '}
            {almacen?.nombre ||
              'Almacén'}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Consulta el saldo disponible por producto o materia prima.
          </p>
        </div>

        <Link
          to="/almacenes"
          className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Volver a almacenes
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={
          aplicarFiltros
        }
        className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_auto_auto]"
      >
        <label className="text-sm font-medium text-gray-700">
          Tipo de artículo

          <select
            value={tipo}
            onChange={(
              evento,
            ) => {
              setTipo(
                evento.target
                  .value,
              )

              setArticuloId('')
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">
              Todos
            </option>

            <option value="MATERIA_PRIMA">
              Materia prima
            </option>

            <option value="PRESENTACION">
              Producto terminado
            </option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Artículo

          <select
            value={
              articuloId
            }
            onChange={(
              evento,
            ) =>
              setArticuloId(
                evento.target
                  .value,
              )
            }
            disabled={!tipo}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">
              {tipo
                ? 'Todos los artículos'
                : 'Seleccione primero el tipo'}
            </option>

            {opcionesArticulo.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nombre}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="submit"
          className="self-end rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Consultar
        </button>

        <button
          type="button"
          onClick={
            limpiarFiltros
          }
          className="self-end rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Limpiar
        </button>
      </form>

      {errorFiltro && (
        <p
          role="alert"
          className="text-sm text-red-700"
        >
          {errorFiltro}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Artículo
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Tipo
              </th>

              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Disponible
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {mostrandoCarga ? (
              <tr>
                <td
                  colSpan="3"
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Cargando existencias...
                </td>
              </tr>
            ) : existencias.length ===
              0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No hay existencias registradas para esta consulta.
                </td>
              </tr>
            ) : (
              existencias.map(
                (
                  existencia,
                ) => (
                  <tr
                    key={`${existencia.almacen_id}-${existencia.tipo_articulo}-${existencia.articulo_id}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {nombreArticulo(
                        existencia.tipo_articulo,
                        existencia.articulo_id,
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {
                        TIPOS[
                          existencia
                            .tipo_articulo
                        ] ||
                        existencia
                          .tipo_articulo
                      }
                    </td>

                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      {
                        formatearCantidad(existencia.cantidad)
                      }{' '}

                      <span className="font-normal text-gray-500">
                        {
                          existencia.unidad
                        }
                      </span>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { listarPresentaciones } from '../../services/presentacionService'
import { listarMateriasPrimas } from '../../services/catalogoMateriaPrimaService'
import {
  generarClaveInventario,
  listarAlmacenes,
  listarExistencias,
  listarMovimientos,
  registrarEgreso,
  registrarIngreso,
  registrarTraslado,
} from '../../services/inventarioConsultaService'

const CONFIG = {
  INGRESO: {
    titulo: 'Ingresos de inventario',
    accion: 'Registrar ingreso',
    ruta: '/inventario/ingresos',
    permiso: 'inventario.ingresar',
  },
  EGRESO: {
    titulo: 'Egresos de inventario',
    accion: 'Registrar egreso',
    ruta: '/inventario/egresos',
    permiso: 'inventario.egresar',
  },
  TRASLADO: {
    titulo: 'Traslados al mostrador',
    accion: 'Trasladar',
    ruta: '/inventario/traslados',
    permiso: 'inventario.trasladar',
  },
}

export default function MovimientoInventarioPage({
  modo,
}) {
  const { tienePermiso } = useAuth()

  const [almacenes, setAlmacenes] =
    useState([])

  const [movimientos, setMovimientos] =
    useState([])

  const [
    presentaciones,
    setPresentaciones,
  ] = useState([])

  const [
    materiasPrimas,
    setMateriasPrimas,
  ] = useState([])

  const [
    existenciasDisponibles,
    setExistenciasDisponibles,
  ] = useState([])

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoArticulos,
    setCargandoArticulos,
  ] = useState(false)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  const [mensaje, setMensaje] =
    useState('')

  const [
    tipoArticulo,
    setTipoArticulo,
  ] = useState(
    modo === 'TRASLADO'
      ? 'PRESENTACION'
      : 'MATERIA_PRIMA',
  )

  const [articuloId, setArticuloId] =
    useState('')

  const [almacenId, setAlmacenId] =
    useState('')

  const [cantidad, setCantidad] =
    useState('')

  const [motivo, setMotivo] =
    useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [
    revisionExistencias,
    setRevisionExistencias,
  ] = useState(0)

  const intento = useRef(null)

  const cargar = useCallback(
    async (signal) => {
      try {
        const [
          almacenesActuales,
          movimientosActuales,
        ] = await Promise.all([
          listarAlmacenes({ signal }),
          listarMovimientos(
            modo,
            { signal },
          ),
        ])

        if (signal?.aborted) return

        setAlmacenes(
          almacenesActuales,
        )

        setMovimientos(
          movimientosActuales,
        )

        setError('')
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err.message ||
              'No se pudo cargar Inventario.',
          )
        }
      } finally {
        if (!signal?.aborted) {
          setCargando(false)
        }
      }
    },
    [modo],
  )

  useEffect(() => {
    const controller =
      new AbortController()

    void cargar(
      controller.signal,
    )

    return () =>
      controller.abort()
  }, [cargar])

  /*
   * Catálogo solamente se usa para mostrar nombres.
   * Inventory continúa almacenando IDs.
   */
  useEffect(() => {
    let activo = true

    const cargarCatalogo =
      async () => {
        const [
          respuestaPresentaciones,
          respuestaMaterias,
        ] = await Promise.allSettled([
          listarPresentaciones(),
          listarMateriasPrimas(),
        ])

        if (!activo) return

        if (
          respuestaPresentaciones.status ===
          'fulfilled'
        ) {
          setPresentaciones(
            respuestaPresentaciones.value
              ?.presentaciones ?? [],
          )
        } else {
          setPresentaciones([])
        }

        if (
          respuestaMaterias.status ===
          'fulfilled'
        ) {
          setMateriasPrimas(
            respuestaMaterias.value
              ?.materias_primas ?? [],
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

  const tipoAlmacen =
    tipoArticulo ===
    'MATERIA_PRIMA'
      ? 'MATERIAS_PRIMAS'
      : 'PRODUCCION'

  const almacenesPermitidos =
    almacenes.filter(
      (item) =>
        item.activo &&
        (
          modo === 'EGRESO' &&
          tipoArticulo ===
            'PRESENTACION'
            ? [
                'PRODUCCION',
                'MOSTRADOR',
              ].includes(
                item.tipo,
              )
            : item.tipo ===
              tipoAlmacen
        ),
    )

  const origen =
    almacenes.find(
      (item) =>
        item.tipo ===
          'PRODUCCION' &&
        item.activo,
    )

  const destino =
    almacenes.find(
      (item) =>
        item.tipo ===
          'MOSTRADOR' &&
        item.activo,
    )

  const nombrePresentacion = (
    id,
  ) => {
    const item =
      presentaciones.find(
        (presentacion) =>
          Number(
            presentacion.presentacion_id,
          ) === Number(id),
      )

    if (!item) {
      return `Presentación #${id}`
    }

    const producto =
      item.producto?.nombre?.trim()

    const presentacion =
      item.nombre?.trim()

    if (
      producto &&
      presentacion
    ) {
      return `${producto} — ${presentacion}`
    }

    return (
      presentacion ||
      producto ||
      `Presentación #${id}`
    )
  }

  const nombreMateriaPrima = (
    id,
  ) => {
    const materia =
      materiasPrimas.find(
        (item) =>
          Number(
            item.id_materia_prima,
          ) === Number(id),
      )

    return (
      materia?.nombre?.trim() ||
      `Materia prima #${id}`
    )
  }

  const nombreArticulo = (
    tipo,
    id,
  ) =>
    tipo === 'PRESENTACION'
      ? nombrePresentacion(id)
      : nombreMateriaPrima(id)

  /*
   * Para EGRESO y TRASLADO solo se ofrecen
   * artículos que realmente tienen saldo
   * en el almacén origen.
   */
  useEffect(() => {
    if (modo === 'INGRESO') {
      setExistenciasDisponibles([])
      setCargandoArticulos(false)
      return undefined
    }

    const almacenOrigenId =
      modo === 'TRASLADO'
        ? origen?.id_almacen
        : Number(almacenId)

    if (
      !Number.isSafeInteger(
        Number(almacenOrigenId),
      ) ||
      Number(almacenOrigenId) < 1
    ) {
      setExistenciasDisponibles([])
      setCargandoArticulos(false)
      return undefined
    }

    const controller =
      new AbortController()

    const cargarExistencias =
      async () => {
        try {
          setCargandoArticulos(true)

          const saldos =
            await listarExistencias(
              {
                almacen_id:
                  Number(
                    almacenOrigenId,
                  ),
                tipo_articulo:
                  tipoArticulo,
              },
              {
                signal:
                  controller.signal,
              },
            )

          if (
            controller.signal.aborted
          ) {
            return
          }

          setExistenciasDisponibles(
            saldos.filter(
              (item) =>
                Number(
                  item.cantidad,
                ) > 0,
            ),
          )
        } catch (err) {
          if (
            err.name !==
            'AbortError'
          ) {
            setExistenciasDisponibles(
              [],
            )

            setError(
              err.message ||
                'No se pudieron consultar las existencias disponibles.',
            )
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setCargandoArticulos(
              false,
            )
          }
        }
      }

    void cargarExistencias()

    return () =>
      controller.abort()
  }, [
    modo,
    almacenId,
    tipoArticulo,
    origen?.id_almacen,
    revisionExistencias,
  ])

  const articulosCatalogo =
    tipoArticulo ===
    'PRESENTACION'
      ? presentaciones
          .filter(
            (item) =>
              item.disponible !==
              false,
          )
          .map((item) => ({
            id:
              item.presentacion_id,
            nombre:
              nombrePresentacion(
                item.presentacion_id,
              ),
            unidad: 'unidad',
            disponible: null,
          }))
      : materiasPrimas
          .filter(
            (item) =>
              item.estado !== false,
          )
          .map((item) => ({
            id:
              item.id_materia_prima,
            nombre:
              item.nombre,
            unidad:
              item.unidad_medida,
            disponible: null,
          }))

  const articulosConStock =
    existenciasDisponibles.map(
      (existencia) => ({
        id:
          existencia.articulo_id,
        nombre:
          nombreArticulo(
            existencia.tipo_articulo,
            existencia.articulo_id,
          ),
        unidad:
          existencia.unidad,
        disponible:
          existencia.cantidad,
      }),
    )

  const opcionesArticulo =
    modo === 'INGRESO'
      ? articulosCatalogo
      : articulosConStock

  const articuloSeleccionado =
    opcionesArticulo.find(
      (item) =>
        Number(item.id) ===
        Number(articuloId),
    )

  const guardar = async (
    evento,
  ) => {
    evento.preventDefault()

    setError('')
    setMensaje('')

    const id =
      articuloId.trim()

    const cantidadLimpia =
      cantidad.trim()

    const motivoLimpio =
      motivo.trim()

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(
        Number(id),
      )
    ) {
      setError(
        'Selecciona un artículo válido.',
      )
      return
    }

    if (
      !opcionesArticulo.some(
        (item) =>
          Number(item.id) ===
          Number(id),
      )
    ) {
      setError(
        'El artículo seleccionado ya no está disponible.',
      )
      return
    }

    if (
      !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(
        cantidadLimpia,
      ) ||
      !/[1-9]/.test(
        cantidadLimpia,
      ) ||
      (
        tipoArticulo ===
          'PRESENTACION' &&
        !/^[1-9]\d*$/.test(
          cantidadLimpia,
        )
      )
    ) {
      setError(
        'La cantidad debe ser positiva; los productos terminados se registran en unidades enteras.',
      )
      return
    }

    if (
      modo !== 'INGRESO' &&
      articuloSeleccionado
        ?.disponible !== null &&
      Number(cantidadLimpia) >
        Number(
          articuloSeleccionado
            .disponible,
        )
    ) {
      setError(
        `Stock insuficiente. Disponible: ${articuloSeleccionado.disponible} ${articuloSeleccionado.unidad}.`,
      )
      return
    }

    if (!motivoLimpio) {
      setError(
        'Indica el motivo del movimiento.',
      )
      return
    }

    const base = {
      tipo_articulo:
        tipoArticulo,
      articulo_id:
        Number(id),
      cantidad:
        cantidadLimpia,
      motivo:
        motivoLimpio,
      observaciones:
        observaciones.trim() ||
        null,
    }

    let datos

    if (
      modo === 'TRASLADO'
    ) {
      if (
        !origen ||
        !destino
      ) {
        setError(
          'Se requieren almacenes activos de Producción y Mostrador.',
        )
        return
      }

      datos = {
        ...base,
        almacen_origen_id:
          origen.id_almacen,
        almacen_destino_id:
          destino.id_almacen,
      }
    } else {
      const almacen =
        almacenesPermitidos.find(
          (item) =>
            item.id_almacen ===
            Number(
              almacenId,
            ),
        )

      if (!almacen) {
        setError(
          'Selecciona un almacén compatible con el artículo.',
        )
        return
      }

      datos = {
        ...base,
        almacen_id:
          almacen.id_almacen,
      }
    }

    const firma =
      `${modo}:${JSON.stringify(
        datos,
      )}`

    if (
      intento.current?.firma !==
      firma
    ) {
      intento.current = {
        firma,
        clave:
          generarClaveInventario(),
      }
    }

    setGuardando(true)

    try {
      const operacion =
        modo === 'INGRESO'
          ? registrarIngreso
          : modo === 'EGRESO'
            ? registrarEgreso
            : registrarTraslado

      const respuesta =
        await operacion(
          datos,
          intento.current.clave,
        )

      intento.current = null

      setMensaje(
        respuesta?.message ||
          `${CONFIG[modo].accion} completado correctamente.`,
      )

      setArticuloId('')
      setCantidad('')
      setMotivo('')
      setObservaciones('')

      try {
        setMovimientos(
          await listarMovimientos(
            modo,
          ),
        )

        setRevisionExistencias(
          (valor) =>
            valor + 1,
        )
      } catch {
        setError(
          'El movimiento se registró, pero no se pudo actualizar el historial. Reintenta la consulta.',
        )
      }
    } catch (err) {
      setError(
        err.message ||
          'No se pudo registrar el movimiento. Reintenta con los mismos datos.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {
            CONFIG[modo]
              .titulo
          }
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Registra movimientos trazables y consulta el historial del almacén.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-2"
        aria-label="Operaciones de inventario"
      >
        {Object.entries(CONFIG)
          .filter(
            ([, valor]) =>
              tienePermiso(
                valor.permiso,
              ),
          )
          .map(
            ([
              clave,
              valor,
            ]) => (
              <Link
                key={clave}
                to={valor.ruta}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  clave === modo
                    ? 'bg-pink-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {valor.titulo}
              </Link>
            ),
          )}
      </nav>

      {mensaje && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {mensaje}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}

          {!guardando && (
            <button
              type="button"
              onClick={() => {
                setCargando(true)
                void cargar()
              }}
              className="ml-2 font-semibold underline"
            >
              Actualizar historial
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={guardar}
        className="grid gap-4 rounded-lg border border-gray-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {modo !==
          'TRASLADO' && (
          <label className="text-sm font-medium text-gray-700">
            Tipo de artículo

            <select
              value={
                tipoArticulo
              }
              onChange={(
                evento,
              ) => {
                setTipoArticulo(
                  evento.target
                    .value,
                )

                setAlmacenId('')
                setArticuloId('')
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="MATERIA_PRIMA">
                Materia prima
              </option>

              <option value="PRESENTACION">
                Producto terminado
              </option>
            </select>
          </label>
        )}

        {modo !==
        'TRASLADO' ? (
          <label className="text-sm font-medium text-gray-700">
            Almacén

            <select
              value={
                almacenId
              }
              onChange={(
                evento,
              ) => {
                setAlmacenId(
                  evento.target
                    .value,
                )

                setArticuloId('')
              }}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">
                Seleccionar
              </option>

              {almacenesPermitidos.map(
                (item) => (
                  <option
                    key={
                      item.id_almacen
                    }
                    value={
                      item.id_almacen
                    }
                  >
                    {item.nombre}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : (
          <div className="self-end rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            {origen?.nombre ||
              'Producción'}{' '}
            →{' '}
            {destino?.nombre ||
              'Mostrador'}
          </div>
        )}

        <label className="text-sm font-medium text-gray-700">
          {tipoArticulo ===
          'PRESENTACION'
            ? 'Producto / presentación'
            : 'Materia prima'}

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
            required
            disabled={
              cargandoArticulos ||
              (
                modo ===
                  'EGRESO' &&
                !almacenId
              )
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">
              {cargandoArticulos
                ? 'Consultando existencias...'
                : opcionesArticulo.length ===
                    0
                  ? modo ===
                    'INGRESO'
                    ? 'No hay artículos disponibles'
                    : 'No hay stock disponible'
                  : 'Seleccionar'}
            </option>

            {opcionesArticulo.map(
              (item) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {item.nombre}
                  {item.disponible !==
                  null
                    ? ` — Disponible: ${item.disponible} ${item.unidad}`
                    : item.unidad
                      ? ` — ${item.unidad}`
                      : ''}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Cantidad

          <input
            inputMode="decimal"
            value={
              cantidad
            }
            onChange={(
              evento,
            ) =>
              setCantidad(
                evento.target
                  .value,
              )
            }
            required
            placeholder={
              tipoArticulo ===
              'MATERIA_PRIMA'
                ? 'Ej. 2.500'
                : 'Ej. 2'
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />

          {articuloSeleccionado
            ?.disponible !==
            null &&
            articuloSeleccionado
              ?.disponible !==
              undefined && (
              <span className="mt-1 block text-xs text-gray-500">
                Disponible:{' '}
                {
                  articuloSeleccionado
                    .disponible
                }{' '}
                {
                  articuloSeleccionado
                    .unidad
                }
              </span>
            )}
        </label>

        <label className="text-sm font-medium text-gray-700">
          Motivo

          <input
            value={motivo}
            onChange={(
              evento,
            ) =>
              setMotivo(
                evento.target
                  .value,
              )
            }
            maxLength={200}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          Observaciones
          {' '}
          <span className="font-normal text-gray-500">
            (opcional)
          </span>

          <input
            value={
              observaciones
            }
            onChange={(
              evento,
            ) =>
              setObservaciones(
                evento.target
                  .value,
              )
            }
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={
              cargando ||
              guardando ||
              almacenes.length ===
                0
            }
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando
              ? 'Guardando...'
              : CONFIG[modo]
                  .accion}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">
                Artículo
              </th>

              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">
                Motivo
              </th>

              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                Cantidad
              </th>

              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                Fecha
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {cargando ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  Cargando movimientos...
                </td>
              </tr>
            ) : error &&
              movimientos.length ===
                0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  Historial no disponible.
                </td>
              </tr>
            ) : movimientos.length ===
              0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              movimientos.map(
                (
                  item,
                  indice,
                ) => (
                  <tr
                    key={
                      item.id_movimiento ||
                      `${item.tipo}-${indice}`
                    }
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {nombreArticulo(
                        item.tipo_articulo,
                        item.articulo_id,
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {item.motivo}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                      {item.cantidad}{' '}
                      {item.unidad}
                    </td>

                    <td className="px-5 py-4 text-right text-sm text-gray-500">
                      {item.created_at
                        ? new Date(
                            item.created_at,
                          ).toLocaleString(
                            'es-BO',
                          )
                        : '—'}
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
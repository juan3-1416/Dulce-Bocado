import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { formatearCantidad } from '../../utils/formatters'
import { listarPresentaciones } from '../../services/presentacionService'
import { listarMateriasPrimas } from '../../services/catalogoMateriaPrimaService'
import {
  generarClaveInventario,
  listarAlmacenes,
  listarExistencias,
  consultarHistorialMovimientos,
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
  const [pagina, setPagina] = useState(1)
  const [paginacion, setPaginacion] = useState({ pagina: 1, ultima_pagina: 1, total: 0 })
  const [saldosActualizados, setSaldosActualizados] = useState([])

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
      setCargando(true)
      try {
        const [
          almacenesActuales,
          movimientosActuales,
        ] = await Promise.all([
          listarAlmacenes({ signal }),
          consultarHistorialMovimientos(
            modo,
            { signal, pagina },
          ),
        ])

        if (signal?.aborted) return

        setAlmacenes(
          almacenesActuales,
        )

        setMovimientos(
          movimientosActuales.movimientos,
        )
        setPaginacion(movimientosActuales.paginacion)

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
    [modo, pagina],
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
      !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(
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
        'La cantidad debe ser positiva y tener como máximo 2 decimales; los productos terminados se registran en unidades enteras.',
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
        `Stock insuficiente. Disponible: ${formatearCantidad(articuloSeleccionado.disponible)} ${articuloSeleccionado.unidad}.`,
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
    setSaldosActualizados([])

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

      // El saldo se refresca aunque falle la consulta del historial.
      setRevisionExistencias((valor) => valor + 1)
      window.dispatchEvent(new Event('inventario:actualizado'))
      try {
        const ids = modo === 'TRASLADO'
          ? [datos.almacen_origen_id, datos.almacen_destino_id]
          : [datos.almacen_id]
        const saldos = await Promise.all(ids.map(async (id) => ({
          almacen_id: id,
          existencias: await listarExistencias({ almacen_id: id, tipo_articulo: datos.tipo_articulo, articulo_id: datos.articulo_id }),
        })))
        setSaldosActualizados(saldos)
      } catch {
        setError('El movimiento se registró, pero no se pudo consultar el saldo actualizado. Revisa las existencias del almacén.')
      }

      try {
        if (pagina !== 1) {
          setPagina(1)
        } else {
          const historial = await consultarHistorialMovimientos(modo)
          setMovimientos(historial.movimientos)
          setPaginacion(historial.paginacion)
        }
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
    <section className="min-w-0 space-y-6 pb-10 text-theme-body">
      <div>
        <h1 className="text-2xl font-semibold text-theme-heading">
          {
            CONFIG[modo]
              .titulo
          }
        </h1>

        <p className="mt-1 text-sm text-theme-muted">
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
                    : 'border border-theme-border-subtle bg-theme-surface text-theme-body hover:bg-theme-hover'
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

      {saldosActualizados.length > 0 && (
        <section aria-label="Existencias actualizadas" className="rounded-xl border border-theme-border-subtle bg-theme-surface p-4">
          <h2 className="font-semibold text-theme-heading">Existencias después del movimiento</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {saldosActualizados.map(({ almacen_id, existencias }) => (
              <div key={almacen_id}>
                <Link to={`/almacenes/${almacen_id}/existencias`} className="font-medium text-pink-700 underline underline-offset-4">
                  {almacenes.find((item) => item.id_almacen === almacen_id)?.nombre || `Almacén #${almacen_id}`}
                </Link>
                {existencias.map((item) => (
                  <p key={`${item.tipo_articulo}-${item.articulo_id}`} className="mt-1 text-sm text-theme-body">
                    {nombreArticulo(item.tipo_articulo, item.articulo_id)}: <strong className="tabular-nums">{formatearCantidad(item.cantidad)} {item.unidad}</strong>
                  </p>
                ))}
                {existencias.length === 0 && <p className="mt-1 text-sm text-theme-body">Sin existencia registrada para el artículo.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <form
        onSubmit={guardar}
        className="grid gap-4 rounded-lg border border-theme-border-subtle bg-theme-surface p-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {modo !==
          'TRASLADO' && (
          <label className="text-sm font-medium text-theme-body">
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
              className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2"
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
          <label className="text-sm font-medium text-theme-body">
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
              className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2"
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

        <label className="text-sm font-medium text-theme-body">
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
            className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2 disabled:bg-gray-100"
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

        <label className="text-sm font-medium text-theme-body">
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
                ? 'Ej. 2.50'
                : 'Ej. 2'
            }
            className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2"
          />

          {articuloSeleccionado
            ?.disponible !==
            null &&
            articuloSeleccionado
              ?.disponible !==
              undefined && (
              <span className="mt-1 block text-xs text-theme-muted">
                Disponible:{' '}
                {formatearCantidad(
                  articuloSeleccionado
                    .disponible
                )}{' '}
                {
                  articuloSeleccionado
                    .unidad
                }
              </span>
            )}
        </label>

        <label className="text-sm font-medium text-theme-body">
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
            className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2"
          />
        </label>

        <label className="text-sm font-medium text-theme-body sm:col-span-2">
          Observaciones
          {' '}
          <span className="font-normal text-theme-muted">
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
            className="mt-1 w-full rounded-lg border border-theme-border-subtle px-3 py-2"
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

      <section aria-label="Historial de movimientos" className="min-w-0 overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
        <div className="border-b border-theme-border-subtle p-4 sm:px-5">
          <h2 className="text-lg font-semibold text-theme-heading">Historial de {modo === 'INGRESO' ? 'ingresos' : modo === 'EGRESO' ? 'egresos' : 'traspasos'}</h2>
          <p className="mt-1 text-sm text-theme-muted">{paginacion.total} movimientos · 10 por página</p>
        </div>
        {cargando ? (
          <p role="status" className="p-8 text-center text-theme-muted">Cargando movimientos...</p>
        ) : movimientos.length === 0 ? (
          <p className="p-8 text-center text-theme-muted">{error ? 'Historial no disponible.' : 'No hay movimientos registrados.'}</p>
        ) : (
          <ul className="divide-y divide-theme-border-subtle">
            {movimientos.map((item) => (
              <li key={item.id_movimiento} className="grid gap-3 p-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' : item.tipo === 'EGRESO' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {item.tipo === 'INGRESO' ? 'Ingreso' : item.tipo === 'EGRESO' ? 'Egreso' : item.tipo === 'TRASLADO' ? 'Traspaso' : item.tipo}
                    </span>
                    <span className="text-xs tabular-nums text-theme-muted">#{item.id_movimiento}</span>
                    <h3 className="break-words text-sm font-semibold text-theme-heading">{nombreArticulo(item.tipo_articulo, item.articulo_id)}</h3>
                  </div>
                  <p className="mt-2 break-words text-sm text-theme-body">{item.motivo}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-theme-body">
                    {item.almacen_origen_id && <span>Origen: {almacenes.find((a) => a.id_almacen === item.almacen_origen_id)?.nombre || `Almacén #${item.almacen_origen_id}`}</span>}
                    {item.almacen_destino_id && <span>Destino: {almacenes.find((a) => a.id_almacen === item.almacen_destino_id)?.nombre || `Almacén #${item.almacen_destino_id}`}</span>}
                  </div>
                </div>
                <div className="lg:text-right">
                  <p className="font-semibold tabular-nums text-theme-heading">{formatearCantidad(item.cantidad)} {item.unidad}</p>
                  <p className="mt-1 text-xs text-theme-muted">{item.created_at ? new Date(item.created_at).toLocaleString('es-BO') : '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Paginación del historial" className="flex flex-wrap items-center justify-between gap-3 border-t border-theme-border-subtle p-4">
          <span className="text-sm text-theme-body">Página {pagina} de {paginacion.ultima_pagina}</span>
          <div className="flex gap-2">
            <button type="button" disabled={cargando || guardando || pagina <= 1} onClick={() => setPagina((actual) => actual - 1)} className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover disabled:opacity-40">Anterior</button>
            <button type="button" disabled={cargando || guardando || pagina >= paginacion.ultima_pagina} onClick={() => setPagina((actual) => actual + 1)} className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover disabled:opacity-40">Siguiente</button>
          </div>
        </nav>
      </section>
    </section>
  )
}

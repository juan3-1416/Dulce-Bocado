import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import PagoModal from './PagoModal'
import ReciboDetalleModal from '../recibos/ReciboDetalleModal'
import {
  crearRecibo,
  listarRecibos,
} from '../../services/reciboService'
import { useAuth } from '../../context/AuthContext'
import {
  listarResumenPagos,
} from '../../services/resumenPagosService'

import {
  anularPago,
  consultarPagosOrigen,

} from '../../services/pagoService'
import { listarPedidos } from '../../services/pedidoService'

const VENTAS_NO_DISPONIBLES = []

const esPedidoCobrable = (pedido) =>
  ['PROGRAMADO', 'EN_PROCESO'].includes(pedido?.estado)

function PagosPage() {
  const { tienePermiso } = useAuth()

  const [tipoOperacion, setTipoOperacion] = useState('PEDIDO')
  const [origenSeleccionadoId, setOrigenSeleccionadoId] = useState('')

  const [resumenOperacion, setResumenOperacion] = useState(null)
  const [pagosOperacion, setPagosOperacion] = useState([])
  const [cargandoOperacion, setCargandoOperacion] = useState(false)


  const [pedidos, setPedidos] = useState([])
  const [metodosPago, setMetodosPago] = useState(['EFECTIVO', 'QR'])

  const [reciboSeleccionado, setReciboSeleccionado] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [pagoParaAnular, setPagoParaAnular] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [operacionesPago, setOperacionesPago] =
    useState([])

  const [resumenGeneral, setResumenGeneral] =
    useState(null)

  const [cargandoResumen, setCargandoResumen] =
    useState(true)

  const [filtroTipoPago, setFiltroTipoPago] =
    useState('')

  const [paginaResumen, setPaginaResumen] = useState(1)
  const [paginacionResumen, setPaginacionResumen] = useState(null)
  const solicitudResumen = useRef(0)
  const cargarResumenGeneral = useCallback(async () => {
    const solicitudActual = ++solicitudResumen.current

    try {
      setCargandoResumen(true)
      setPaginacionResumen(null)

      const respuesta = await listarResumenPagos(
        filtroTipoPago,
        paginaResumen,
        15,
      )

      if (solicitudActual !== solicitudResumen.current) return

      if (!respuesta.paginacion) {
        throw new Error('Payment Service no devolvio la paginacion.')
      }

      const ultimaPagina = Math.max(
        1,
        Number(respuesta.paginacion.last_page ?? 1),
      )

      if (paginaResumen > ultimaPagina) {
        solicitudResumen.current += 1
        setPaginaResumen(ultimaPagina)
        return
      }

      setOperacionesPago(respuesta.operaciones ?? [])
      setResumenGeneral(respuesta.resumen ?? null)

      setPaginacionResumen({
        currentPage: Number(respuesta.paginacion.current_page),
        lastPage: ultimaPagina,
        total: Number(respuesta.paginacion.total ?? 0),
      })
    } catch (err) {
      if (solicitudActual !== solicitudResumen.current) return

      setOperacionesPago([])
      setResumenGeneral(null)
      setPaginacionResumen(null)

      if (err.status === 403) {
        setError('No tienes permiso para visualizar pagos.')
      } else {
        setError(
          err.message ||
          'No se pudo cargar el resumen general de pagos.',
        )
      }
    } finally {
      if (solicitudActual === solicitudResumen.current) {
        setCargandoResumen(false)
      }
    }
  }, [filtroTipoPago, paginaResumen])

  // Cargar exclusivamente pedidos para cobros.
  const cargarCatalogos = useCallback(async () => {
    try {
      setCargandoCatalogos(true)

      const respuesta = await listarPedidos({ per_page: 50 })

      const documentos =
        respuesta.pedidos ?? respuesta.data ?? []

      setPedidos(documentos)
      setMetodosPago(['EFECTIVO', 'QR'])

      setOrigenSeleccionadoId((actual) => {
        if (actual) return actual

        const primero = documentos.find(esPedidoCobrable)

        return primero ? String(primero.id_pedido) : ''
      })
    } catch (err) {
      setError(
        err.message ||
        'No se pudieron cargar los pedidos para cobro.',
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }, [])

  // Consulta saldo y pagos en tiempo real en payment-service
  const cargarPagosOperacion = useCallback(async (tipo, id) => {
    if (!id || Number(id) <= 0) {
      setResumenOperacion(null)
      setPagosOperacion([])
      return
    }

    try {
      setCargandoOperacion(true)
      setError('')
      const data = await consultarPagosOrigen(tipo, id)
      setResumenOperacion({
        origen_tipo: data.origen_tipo,
        origen_id: data.origen_id,
        estado_origen: data.estado_origen,
        total: Number(data.total ?? 0),
        pagado: Number(data.pagado ?? 0),
        saldo: Number(data.saldo ?? 0),
        moneda: data.moneda || 'BOB',
      })
      setPagosOperacion(data.pagos ?? [])
    } catch (err) {
      if (err.status === 403) {
        setError('No tienes permiso para consultar pagos (se requiere pagos.ver).')
      } else if (err.status === 404) {
        setError(`La operación ${tipo} #${id} no fue encontrada en su servicio propietario.`)
      } else {
        setError(err.message || 'No se pudo consultar el saldo y pagos de la operación.')
      }
      setResumenOperacion(null)
      setPagosOperacion([])
    } finally {
      setCargandoOperacion(false)
    }
  }, [])
  useEffect(() => {
    cargarResumenGeneral()

    return () => {
      solicitudResumen.current += 1
    }
  }, [cargarResumenGeneral])

  useEffect(() => {
    cargarCatalogos()
  }, [cargarCatalogos])

  useEffect(() => {
    cargarPagosOperacion('PEDIDO', origenSeleccionadoId)
  }, [origenSeleccionadoId, cargarPagosOperacion])

  const abrirNuevoPago = (tipo = 'PEDIDO', id = null) => {
    setError('')
    setMensaje('')

    if (tipo !== 'PEDIDO') {
      setError('Las ventas se cobran desde Gestion de ventas.')
      return
    }

    if (!tienePermiso('pagos.crear')) {
      setError('No tiene permiso para registrar cobros.')
      return
    }

    const seleccionado = pedidos.find(
      (pedido) =>
        Number(pedido.id_pedido) ===
        Number(id ?? origenSeleccionadoId),
    )

    if (id !== null && !esPedidoCobrable(seleccionado)) {
      setError('El pedido no se encuentra disponible para cobro.')
      return
    }

    const pedido = esPedidoCobrable(seleccionado)
      ? seleccionado
      : pedidos.find(esPedidoCobrable)

    if (!pedido) {
      setError('No existen pedidos disponibles para cobro.')
      return
    }

    setTipoOperacion('PEDIDO')
    setOrigenSeleccionadoId(String(pedido.id_pedido))
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
  }

  const manejarGuardado = async (mensajeRespuesta) => {
    setMensaje(mensajeRespuesta)
    if (origenSeleccionadoId) {
      await cargarPagosOperacion(tipoOperacion, origenSeleccionadoId)
    }
    await cargarCatalogos()
    await cargarResumenGeneral()
  }

  const abrirModalAnular = (pago) => {
    setError('')
    setMensaje('')
    setPagoParaAnular(pago)
    setMotivoAnulacion('')
  }

  const cerrarModalAnular = () => {
    if (anulando) return
    setPagoParaAnular(null)
    setMotivoAnulacion('')
  }

  const confirmarAnulacion = async () => {
    const motivo = motivoAnulacion.trim()
    if (motivo.length < 5) {
      setError('El motivo de anulación debe tener al menos 5 caracteres.')
      return
    }

    try {
      setAnulando(true)
      setError('')
      await anularPago(pagoParaAnular.id_pago, motivo)
      setMensaje('Pago anulado correctamente.')
      setPagoParaAnular(null)
      setMotivoAnulacion('')
      if (origenSeleccionadoId) {
        await cargarPagosOperacion(tipoOperacion, origenSeleccionadoId)
      }
    } catch (err) {
      setError(err.message || 'No se pudo anular el pago.')
    } finally {
      setAnulando(false)
    }
  }

  const abrirReciboOperacion = async (operacion) => {
    try {
      setError('')

      const tipo =
        String(
          operacion.origen_tipo,
        ).toUpperCase()

      if (
        !['VENTA', 'PEDIDO'].includes(
          tipo,
        )
      ) {
        throw new Error(
          'El tipo de operación no es válido.',
        )
      }

      const respuestaPagos =
        await consultarPagosOrigen(
          tipo,
          operacion.origen_id,
        )

      const pagos =
        Array.isArray(
          respuestaPagos.pagos,
        )
          ? respuestaPagos.pagos
          : []

      const pagosConfirmados =
        pagos
          .filter(
            (pago) =>
              pago.estado ===
              'CONFIRMADO',
          )
          .sort(
            (a, b) =>
              Number(b.id_pago) -
              Number(a.id_pago),
          )

      /*
       * Buscamos el recibo del pago confirmado
       * más reciente.
       *
       * En PEDIDOS completamente pagados,
       * ese recibo final contiene además
       * pagos_origen con todos los abonos.
       */
      for (
        const pago of
        pagosConfirmados
      ) {
        const respuestaRecibos =
          await listarRecibos({
            buscar:
              String(
                pago.id_pago,
              ),

            estado:
              'EMITIDO',
          })

        const recibo =
          (
            respuestaRecibos.recibos ??
            []
          ).find(
            (item) =>
              Number(
                item.id_pago,
              ) ===
                Number(
                  pago.id_pago,
                ) &&
              item.estado ===
                'EMITIDO',
          )

        if (
          recibo?.id_recibo
        ) {
          setReciboSeleccionado(
            recibo.id_recibo,
          )

          return
        }
      }

      /*
       * Un pedido puede haber quedado totalmente pagado
       * sin que sus pagos anteriores hayan generado recibo.
       *
       * Si no encontramos ningún recibo EMITIDO,
       * generamos el recibo del último pago confirmado.
       * Ese recibo contiene el acumulado y pagos_origen.
       */
      if (
        tipo === 'PEDIDO' &&
        pagosConfirmados.length > 0
      ) {
        const ultimoPago =
          pagosConfirmados[0]

        const respuestaRecibo =
          await crearRecibo({
            id_pago:
              Number(
                ultimoPago.id_pago,
              ),
          })

        const nuevoRecibo =
          respuestaRecibo?.recibo

        if (
          nuevoRecibo?.id_recibo
        ) {
          setMensaje(
            `Recibo final del Pedido #${operacion.origen_id} generado correctamente.`,
          )

          setReciboSeleccionado(
            nuevoRecibo.id_recibo,
          )

          return
        }
      }
      const nombreOrigen =
        tipo === 'PEDIDO'
          ? 'Pedido'
          : 'Venta'

      setError(
        `No se encontró un recibo emitido para ${nombreOrigen} #${operacion.origen_id}.`,
      )
    } catch (err) {
      setError(
        err.message ||
          'No se pudo consultar el recibo de la operación.',
      )
    }
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleString('es-BO')
  }

  const obtenerNombreClienteDoc = (doc) => {
    if (!doc) return 'Cliente ocasional'
    if (doc.cliente) {
      return [doc.cliente.nombre, doc.cliente.apellido].filter(Boolean).join(' ')
    }
    return doc.nombre_cliente_ocasional || 'Cliente ocasional'
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Pagos y Saldos
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Control de cobros en efectivo, cálculo atómico de saldos y auditoría por operación (Payment Service).
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirNuevoPago()}
          disabled={cargandoCatalogos || !tienePermiso('pagos.crear') || !pedidos.some(esPedidoCobrable)}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoCatalogos ? 'Cargando comprobantes...' : 'Cobrar pedido'}
        </button>
      </div>

      {mensaje && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {/* Selector de Operación para consulta en Payment Service */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
          Consultar pagos y saldo de pedidos
        </h2>

        <div>
          <label
            htmlFor="origen_id_selector"
            className="mb-1 block text-xs font-semibold uppercase text-gray-500"
          >
            Seleccionar pedido
          </label>

          <select
            id="origen_id_selector"
            value={origenSeleccionadoId}
            onChange={(e) => setOrigenSeleccionadoId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <option value="">
              -- Seleccionar pedido --
            </option>

            {origenSeleccionadoId &&
              !pedidos.some(
                (p) => String(p.id_pedido) === origenSeleccionadoId,
              ) && (
                <option value={origenSeleccionadoId}>
                  Pedido #{origenSeleccionadoId}
                </option>
              )}

            {pedidos.map((pedido) => (
              <option
                key={pedido.id_pedido}
                value={pedido.id_pedido}
              >
                Pedido #{pedido.id_pedido} — {obtenerNombreClienteDoc(pedido)} — Total Bs {Number(pedido.total ?? pedido.monto_total ?? 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Card de Saldo Oficial (Calculado por Payment Service) */}
      {cargandoOperacion ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          Consultando saldo y pagos en Payment Service...
        </div>
      ) : resumenOperacion ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
                Comprobante Oficial
              </span>
              <h2 className="text-xl font-bold text-gray-900">
                {resumenOperacion.origen_tipo} #{resumenOperacion.origen_id}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Estado del comprobante:</span>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {resumenOperacion.estado_origen}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-xs font-semibold uppercase text-gray-500">Total Operación</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                Bs {resumenOperacion.total.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
              <p className="text-xs font-semibold uppercase text-emerald-700">Total Pagado</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">
                Bs {resumenOperacion.pagado.toFixed(2)}
              </p>
            </div>

            <div
              className={`rounded-lg p-4 border ${
                resumenOperacion.saldo > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase ${
                  resumenOperacion.saldo > 0 ? 'text-amber-800' : 'text-green-800'
                }`}
              >
                Saldo Pendiente
              </p>
              <p
                className={`mt-1 text-lg font-bold ${
                  resumenOperacion.saldo > 0 ? 'text-pink-600' : 'text-green-700'
                }`}
              >
                Bs {resumenOperacion.saldo.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center justify-center p-2">
              {resumenOperacion.saldo > 0 &&
                resumenOperacion.origen_tipo === 'PEDIDO' &&
                esPedidoCobrable({ estado: resumenOperacion.estado_origen }) ? (
                <button
                  type="button"
                  onClick={() => abrirNuevoPago(resumenOperacion.origen_tipo, resumenOperacion.origen_id)}
                  disabled={!tienePermiso('pagos.crear')}
                  className="w-full rounded-lg bg-emerald-600 py-3 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  Cobrar Saldo (Bs {resumenOperacion.saldo.toFixed(2)})
                </button>
              ) : resumenOperacion.saldo <= 0 ? (
                <div className="text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-3 px-4 w-full border border-emerald-200">
                  ✓ Pagado en su totalidad
                </div>
              ) : (
                <div className="text-center text-xs font-semibold text-gray-500">
                  No disponible para cobro
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabla de Pagos de la Operación */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Historial de Pagos Registrados en Payment Service
            {resumenOperacion ? ` para ${resumenOperacion.origen_tipo} #${resumenOperacion.origen_id}` : ''}
          </h3>
        </div>

        {cargandoOperacion ? (
          <div className="p-8 text-center text-gray-500">Cargando pagos...</div>
        ) : pagosOperacion.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {resumenOperacion
              ? `No se han registrado pagos para ${resumenOperacion.origen_tipo} #${resumenOperacion.origen_id}.`
              : 'Selecciona una operación para consultar sus pagos registrados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-3 text-left">N.º Pago</th>
                  <th className="px-5 py-3 text-left">Operación UUID</th>
                  <th className="px-5 py-3 text-left">Medio</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                  <th className="px-5 py-3 text-left">Fecha de Confirmación</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {pagosOperacion.map((pago) => (
                  <tr key={pago.id_pago} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-bold text-gray-900">
                      #{pago.id_pago}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {pago.operacion_id || '—'}
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-800">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                        {pago.medio || 'EFECTIVO'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                      Bs {Number(pago.monto ?? 0).toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatearFecha(pago.confirmado_at || pago.fecha_pago || pago.created_at)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        {pago.estado}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {pago.estado === 'REGISTRADO' && tienePermiso('pagos.anular') && (
                        <button
                          type="button"
                          onClick={() => abrirModalAnular(pago)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Resumen General de Pagos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Visualiza pagos realizados a ventas y pedidos, junto con su saldo pendiente.
            </p>
          </div>

          <div className="w-full sm:w-48">
            <label
              htmlFor="filtro_tipo_pago"
              className="mb-1 block text-xs font-semibold uppercase text-gray-500"
            >
              Tipo
            </label>

            <select
              id="filtro_tipo_pago"
              value={filtroTipoPago}
              onChange={(event) => {
                setPaginaResumen(1)
                setFiltroTipoPago(event.target.value)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">
                Ventas y pedidos
              </option>
              <option value="VENTA">
                Solo ventas
              </option>
              <option value="PEDIDO">
                Solo pedidos
              </option>
            </select>
          </div>
        </div>

        {cargandoResumen ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando pagos...
          </div>
        ) : operacionesPago.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No existen pagos registrados para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Tipo
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Operación
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Total
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Pagado
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Saldo
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                    Pagos
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {operacionesPago.map(
                  (operacion) => {
                    const saldo =
                      Number(
                        operacion.saldo ??
                          0,
                      )

                    const estado =
                      operacion.estado_pago

                    return (
                      <tr
                        key={`${operacion.origen_tipo}-${operacion.origen_id}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              operacion.origen_tipo ===
                              'PEDIDO'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {operacion.origen_tipo}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {operacion.origen_tipo ===
                          'PEDIDO'
                            ? 'Pedido'
                            : 'Venta'}{' '}
                          #{operacion.origen_id}
                        </td>

                        <td className="px-5 py-4 text-right font-medium tabular-nums">
                          Bs{' '}
                          {Number(
                            operacion.total ??
                              0,
                          ).toFixed(2)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-emerald-700 tabular-nums">
                          Bs{' '}
                          {Number(
                            operacion.pagado ??
                              0,
                          ).toFixed(2)}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-bold tabular-nums ${
                            saldo > 0
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          Bs {saldo.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              estado ===
                              'PAGADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : estado ===
                                    'PARCIAL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {estado ===
                            'PARCIAL'
                              ? 'PAGO PARCIAL'
                              : estado}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-semibold">
                          {operacion.cantidad_pagos_confirmados ??
                            operacion.cantidad_pagos ??
                            0}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {operacion.origen_tipo ===
                            'VENTA' ||
                          (
                            operacion.origen_tipo ===
                              'PEDIDO' &&
                            (
                              saldo <= 0 ||
                              estado === 'PAGADO'
                            )
                          ) ? (
                            <button
                              type="button"
                              onClick={() =>
                                abrirReciboOperacion(
                                  operacion,
                                )
                              }
                              className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Ver recibo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTipoOperacion(
                                  'PEDIDO',
                                )

                                setOrigenSeleccionadoId(
                                  String(
                                    operacion.origen_id,
                                  ),
                                )
                              }}
                              className="rounded-lg border border-pink-200 px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-50"
                            >
                              Ver pagos
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paginacionResumen && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-theme-muted">
          <span>
            Total: {paginacionResumen.total}
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={paginacionResumen.currentPage <= 1}
              onClick={() =>
                setPaginaResumen((actual) => Math.max(1, actual - 1))
              }
              className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-40"
            >
              Anterior
            </button>

            <span>
              Página {paginacionResumen.currentPage} de {paginacionResumen.lastPage}
            </span>

            <button
              type="button"
              disabled={paginacionResumen.currentPage >= paginacionResumen.lastPage}
              onClick={() =>
                setPaginaResumen((actual) => actual + 1)
              }
              className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para Registrar Pago en Efectivo */}
      <PagoModal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        onGuardado={manejarGuardado}
        ventas={VENTAS_NO_DISPONIBLES}
        pedidos={pedidos.filter(esPedidoCobrable)}
        metodosPago={metodosPago}
        ventaInicialId={null}
        pedidoSeleccionadoInicial={
          tipoOperacion === 'PEDIDO' && origenSeleccionadoId
            ? pedidos.find((p) => Number(p.id_pedido) === Number(origenSeleccionadoId))
            : null
        }
      />

      <ReciboDetalleModal
        abierto={Boolean(reciboSeleccionado)}
        reciboId={reciboSeleccionado}
        onCerrar={() => setReciboSeleccionado(null)}
        onActualizado={() => {
          if (origenSeleccionadoId) {
            cargarPagosOperacion(tipoOperacion, origenSeleccionadoId)
          }
        }}
      />

      {/* Modal de Anulación */}
      {pagoParaAnular && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Anular Pago</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pago #{pagoParaAnular.id_pago} — Bs {Number(pagoParaAnular.monto).toFixed(2)}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                El pago dejará de computarse y el saldo de la operación se actualizará en Payment Service.
              </div>

              <div>
                <label htmlFor="motivo_anulacion_pago" className="mb-1 block text-sm font-medium text-gray-700">
                  Motivo de anulación
                </label>
                <textarea
                  id="motivo_anulacion_pago"
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Explique el motivo de la anulación..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarModalAnular}
                  disabled={anulando}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAnulacion}
                  disabled={anulando || motivoAnulacion.trim().length < 5}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PagosPage

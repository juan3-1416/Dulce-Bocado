import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'

import {
  anularVenta,
  generarIdempotencyKey,
  listarVentas,
  obtenerVenta,
} from '../../services/ventaService'
import { listarClientes } from '../../services/clienteService'
import { listarPresentacionesVendibles } from '../../services/catalogoVentasService'
import { consultarPagosOrigen } from '../../services/pagoService'
import {
  crearRecibo,
  listarRecibos,
} from '../../services/reciboService'
import { useAuth } from '../../context/AuthContext'
import { formatearCantidad } from '../../utils/formatters'
import VentaModal from './VentaModal'
import ConfirmarVentaModal from './ConfirmarVentaModal'
import PagoModal from '../pagos/PagoModal'
import ReciboDetalleModal from '../recibos/ReciboDetalleModal'

const MIN_MOTIVO_ANULACION = 3

const importeEnCentavos = (valor) => {
  if (valor == null || !/^\d+(?:\.\d{1,2})?$/.test(String(valor))) {
    return null
  }

  const centavos = Math.round(Number(valor) * 100)

  return Number.isSafeInteger(centavos) ? centavos : null
}

const tienePagoCompleto = (venta, resumen) => {
  const total = importeEnCentavos(venta?.total)
  const pagado = importeEnCentavos(resumen?.pagado)
  const saldo = importeEnCentavos(resumen?.saldo)

  return total !== null &&
    total > 0 &&
    pagado === total &&
    saldo === 0
}

function VentasPage() {
  const { tienePermiso } = useAuth()
  const [presentaciones, setPresentaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [catalogoDisponible, setCatalogoDisponible] = useState(false)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [errorClientes, setErrorClientes] = useState('')
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false)
  const [ventaParaEditar, setVentaParaEditar] = useState(null)
  const [ventaParaConfirmar, setVentaParaConfirmar] = useState(null)

  const [modalPagoAbierto, setModalPagoAbierto] = useState(false)

  const [ventasParaPago, setVentasParaPago] = useState([])

  const [metodosPago, setMetodosPago] = useState([
    'EFECTIVO',
    'QR',
  ])

  const [ventaPagoInicialId, setVentaPagoInicialId] = useState(null)
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null)
  const [ventas, setVentas] =
    useState([])

  const [estado, setEstado] =
    useState('')

  const [fechaVenta, setFechaVenta] =
    useState('')

  const [pagina, setPagina] =
    useState(1)

  const [paginacion, setPaginacion] =
    useState(null)

  const [
    ventaSeleccionada,
    setVentaSeleccionada,
  ] = useState(null)

  const [
    ventaParaAnular,
    setVentaParaAnular,
  ] = useState(null)

  const [
    motivoAnulacion,
    setMotivoAnulacion,
  ] = useState('')
  const intentoAnular = useRef(null)
  const solicitudVentas = useRef(0)

  const [cargando, setCargando] =
    useState(true)

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] = useState(false)

  const [anulando, setAnulando] =
    useState(false)

  const [error, setError] =
    useState('')
  const [errorAnulacion, setErrorAnulacion] = useState('')

  const [mensaje, setMensaje] =
    useState('')

  const cargarVentas =
    useCallback(async () => {
      const solicitudActual = ++solicitudVentas.current
      try {
        setCargando(true)
        setError('')
        setPaginacion(null)

        const respuesta =
          await listarVentas({
            estado,
            fecha_venta: fechaVenta,
            page: pagina,
            per_page: 15,
          })

        if (solicitudActual !== solicitudVentas.current) return

        const ultimaPagina = Math.max(1, respuesta.last_page ?? 1)
        if (pagina > ultimaPagina) {
          solicitudVentas.current += 1
          setPagina(ultimaPagina)
          return
        }

        setVentas(
          respuesta.data ?? [],
        )

        setPaginacion({
          currentPage:
            respuesta.current_page ?? 1,
          lastPage:
            ultimaPagina,
          total:
            respuesta.total ?? 0,
        })
      } catch (errorPeticion) {
        if (solicitudActual !== solicitudVentas.current) return

        if (
          errorPeticion.status === 401
        ) {
          setError(
            'Tu sesión no es válida o ha expirado.',
          )
        } else if (
          errorPeticion.status === 403
        ) {
          setError(
            'No tienes permiso para consultar ventas.',
          )
        } else {
          setError(
            errorPeticion.message ||
              'No se pudieron cargar las ventas.',
          )
        }

        setVentas([])
      } finally {
        if (solicitudActual === solicitudVentas.current) {
          setCargando(false)
        }
      }
    }, [estado, fechaVenta, pagina])

  useEffect(() => {
    cargarVentas()
    return () => {
      solicitudVentas.current += 1
    }
  }, [cargarVentas])
  useEffect(() => {
    let activo = true

    const cargarClientesParaHistorial = async () => {
      try {
        const respuesta = await listarClientes()

        if (!activo) return

        setClientes(respuesta.clientes ?? [])
        setErrorClientes('')
      } catch (errorPeticion) {
        if (!activo) return

        setClientes([])
        setErrorClientes(
          errorPeticion.message ||
            'No se pudieron cargar los clientes registrados.',
        )
      }
    }

    cargarClientesParaHistorial()

    return () => {
      activo = false
    }
  }, [])

  const cargarCatalogo = useCallback(async () => {
    setCargandoCatalogo(true)
    try {
      const opciones = await listarPresentacionesVendibles()
      setPresentaciones(opciones)
      setCatalogoDisponible(opciones.length > 0)
      setErrorCatalogo(opciones.length > 0
        ? ''
        : 'Catálogo no tiene presentaciones disponibles para venta.')
      return opciones
    } catch (errorPeticion) {
      setPresentaciones([])
      setCatalogoDisponible(false)
      setErrorCatalogo(errorPeticion.message || 'No se pudo consultar Catálogo.')
      return []
    } finally {
      setCargandoCatalogo(false)
    }
  }, [])

  useEffect(() => {
    cargarCatalogo()
  }, [cargarCatalogo])

  const abrirFormulario = async (venta = null) => {
    if (!catalogoDisponible) return
    try {
      setError('')
      setMensaje('')
      const opciones = await cargarCatalogo()
      if (opciones.length === 0) return
      try {
        const respuestaClientes = await listarClientes()
        setClientes(respuestaClientes.clientes ?? [])
        setErrorClientes('')
      } catch (errorPeticion) {
        setClientes([])
        setErrorClientes(errorPeticion.message || 'No se pudieron cargar los clientes registrados.')
      }
      if (venta) {
        const respuesta = await obtenerVenta(venta.id_venta)
        setVentaParaEditar(respuesta.venta ?? respuesta)
      } else {
        setVentaParaEditar(null)
      }
      setModalVentaAbierto(true)
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudieron cargar los datos de la venta.')
    }
  }

  const abrirDetalle = async (
    venta,
  ) => {
    try {
      setCargandoDetalle(true)
      setError('')

      const respuesta =
        await obtenerVenta(
          venta.id_venta,
        )

      setVentaSeleccionada(
        respuesta.venta ??
          respuesta,
      )
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudo consultar la venta.',
      )
    } finally {
      setCargandoDetalle(false)
    }
  }

  const abrirModalConfirmar = async (venta) => {
    if (!venta?.id_venta || !tienePermiso('ventas.confirmar')) {
      return false
    }

    setError('')
    setMensaje('')

    try {
      setCargandoDetalle(true)

      const respuesta = await obtenerVenta(venta.id_venta)
      const ventaActual = respuesta?.venta ?? respuesta

      if (ventaActual.estado !== 'BORRADOR') {
        setError('Solo se pueden confirmar ventas en borrador.')
        return false
      }

      // Sales vuelve a validar obligatoriamente el pago al confirmar.
      // No exigir un permiso adicional a quien solo puede confirmar ventas.
      if (tienePermiso('pagos.ver') || tienePermiso('pagos.crear')) {
        const resumen = await consultarPagosOrigen(
          'VENTA',
          ventaActual.id_venta,
        )

        if (!tienePagoCompleto(ventaActual, resumen)) {
          setError(
            'No se puede confirmar la venta. Debe tener registrado y confirmado el pago por el importe total.',
          )
          return false
        }
      }

      setVentaParaConfirmar(ventaActual)
      return true
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudo verificar el pago de la venta.',
      )
      return false
    } finally {
      setCargandoDetalle(false)
    }
  }

  const cerrarModalConfirmar = () => {
    setVentaParaConfirmar(null)
  }

  const cerrarModalPago = () => {
    setModalPagoAbierto(false)
    setVentasParaPago([])
    setVentaPagoInicialId(null)
  }

  const abrirCobroVenta = async (venta) => {
    if (!venta?.id_venta || venta.estado !== 'BORRADOR') return

    if (!tienePermiso('pagos.crear')) {
      setError('No tiene permisos para registrar pagos.')
      return
    }

    try {
      setError('')
      setMensaje('')

      const respuestaVenta = await obtenerVenta(venta.id_venta)
      const ventaCobrable = respuestaVenta?.venta ?? respuestaVenta

      if (
        !ventaCobrable?.id_venta ||
        ventaCobrable.estado !== 'BORRADOR'
      ) {
        setError('La venta no se encuentra disponible para cobrar.')
        return
      }

      const resumen = await consultarPagosOrigen(
        'VENTA',
        ventaCobrable.id_venta,
      )

      const saldo = Number(resumen.saldo)

      if (resumen.saldo == null || !Number.isFinite(saldo) || saldo < 0) {
        setError('El saldo requiere verificacion antes de continuar.')
        return
      }

      if (saldo === 0) {
        if (!tienePagoCompleto(ventaCobrable, resumen)) {
          setError('El importe registrado no coincide con el total de la venta.')
          return
        }

        if (tienePermiso('ventas.confirmar')) {
          const abierto = await abrirModalConfirmar(ventaCobrable)

          if (!abierto) return
        }

        setMensaje('La venta ya está pagada. No debe cobrarse nuevamente.')
        return
      }

      setVentasParaPago([{
        ...ventaCobrable,
        total_pagado: resumen.pagado,
        saldo: resumen.saldo,
      }])

      setMetodosPago(['EFECTIVO', 'QR'])
      setVentaPagoInicialId(ventaCobrable.id_venta)
      setModalPagoAbierto(true)
    } catch (errorPeticion) {
      setError(
        errorPeticion.message ||
          'No se pudo abrir el proceso de pago.',
      )
    }
  }


  const manejarPagoGuardado = async (
    mensajeRespuesta,
    pagoGuardado,
  ) => {
    cerrarModalPago()
    setError('')

    const idVenta = Number(
      pagoGuardado?.origen_id ?? ventaPagoInicialId,
    )

    try {
      if (!Number.isInteger(idVenta) || idVenta <= 0) {
        throw new Error('No se pudo identificar la venta.')
      }

      const resumen = await consultarPagosOrigen('VENTA', idVenta)

      await cargarVentas()

      const respuesta = await obtenerVenta(idVenta)
      const ventaPagada = respuesta?.venta ?? respuesta

      if (!tienePagoCompleto(ventaPagada, resumen)) {
        setError('La venta todavía no tiene confirmado el pago completo.')
        return
      }

      if (ventaPagada.estado === 'CONFIRMADA') {
        setMensaje('La venta ya se encuentra confirmada.')
        return
      }

      if (ventaPagada.estado !== 'BORRADOR') {
        setError('El pago está registrado, pero la venta no se puede confirmar.')
        return
      }

      if (tienePermiso('ventas.confirmar')) {
        const abierto = await abrirModalConfirmar(ventaPagada)

        if (!abierto) return
      }

      setMensaje('Pago completo registrado. Pendiente de confirmar la venta.')
    } catch (errorPeticion) {
      setError(
        'No se pudo verificar el cobro. Consulte los pagos antes de volver a cobrar. ' +
          (errorPeticion.message || ''),
      )
    }
  }

  const abrirReciboPago = async (
    mensajeRespuesta,
    pagoGuardado,
  ) => {
    setMensaje(
      mensajeRespuesta ||
        'Pago registrado correctamente.',
    )

    if (!pagoGuardado?.id_pago) {
      await cargarVentas()
      return
    }

    try {
      setError('')

      const idPago =
        Number(pagoGuardado.id_pago)

      /*
       * Cerramos Pago/QR antes de mostrar
       * el comprobante.
       */
      cerrarModalPago()

      await cargarVentas()

      /*
       * Primero comprobamos si el pago
       * ya tiene un recibo emitido.
       */
      const respuestaRecibos =
        await listarRecibos({
          buscar: String(idPago),
          estado: 'EMITIDO',
        })

      let recibo =
        (
          respuestaRecibos?.recibos ??
          []
        ).find(
          (item) =>
            Number(
              item.id_pago ??
                item.pago_id,
            ) === idPago &&
            item.estado === 'EMITIDO',
        )

      /*
       * Si aún no existe, lo generamos.
       */
      if (!recibo) {
        const respuestaRecibo =
          await crearRecibo({
            id_pago: idPago,
          })

        recibo =
          respuestaRecibo?.recibo ??
          null
      }

      if (!recibo?.id_recibo) {
        throw new Error(
          'No se obtuvo el identificador del recibo.',
        )
      }

      setMensaje(
        'Venta confirmada correctamente. Recibo generado.',
      )

      /*
       * Abre automáticamente
       * ReciboDetalleModal.
       */
      setReciboSeleccionado(
        recibo.id_recibo,
      )
    } catch (errorPeticion) {
      setMensaje(
        'La venta fue confirmada correctamente.',
      )

      setError(
        errorPeticion?.message
          ? `La venta fue confirmada, pero no se pudo abrir automáticamente el recibo: ${errorPeticion.message}`
          : 'La venta fue confirmada, pero no se pudo abrir automáticamente el recibo.',
      )
    }
  }

  const abrirModalAnular = (
    venta,
  ) => {
    intentoAnular.current = null
    setError('')
    setErrorAnulacion('')
    setMensaje('')
    setVentaParaAnular(venta)
    setMotivoAnulacion('')
  }

  const cerrarModalAnular = () => {
    if (anulando) {
      return
    }

    setVentaParaAnular(null)
    setMotivoAnulacion('')
    setErrorAnulacion('')
    intentoAnular.current = null
  }

  const confirmarAnulacion =
    async () => {
      if (anulando) return
      const motivo =
        motivoAnulacion.trim()

      if (motivo.length < MIN_MOTIVO_ANULACION) {
        setErrorAnulacion(
          `El motivo de anulación debe tener al menos ${MIN_MOTIVO_ANULACION} caracteres.`,
        )

        return
      }

      const payload = `${ventaParaAnular.id_venta}:${motivo}`
      if (intentoAnular.current?.payload !== payload) {
        intentoAnular.current = { payload, clave: generarIdempotencyKey() }
      }

      try {
        setAnulando(true)
        setErrorAnulacion('')

        await anularVenta(
          ventaParaAnular.id_venta,
          motivo,
          intentoAnular.current.clave,
        )

        setMensaje(
          'Venta anulada correctamente.',
        )

        setVentaParaAnular(null)
        setMotivoAnulacion('')
        intentoAnular.current = null

        await cargarVentas()
      } catch (errorPeticion) {
        setErrorAnulacion(
          errorPeticion.message ||
            'No se pudo anular la venta.',
        )
      } finally {
        setAnulando(false)
      }
    }

  const obtenerCliente = (
    venta,
  ) => {
    if (
      venta.nombre_cliente_ocasional
    ) {
      return (
        venta.nombre_cliente_ocasional
      )
    }

    if (venta.id_cliente) {
      const cliente = clientes.find(
        (item) =>
          Number(item.id_cliente) ===
          Number(venta.id_cliente),
      )

      if (cliente) {
        const nombreCompleto = [
          cliente.nombre,
          cliente.apellido,
        ]
          .filter(Boolean)
          .join(' ')
          .trim()

        if (nombreCompleto) {
          return nombreCompleto
        }
      }

      return `Cliente #${venta.id_cliente}`
    }

    return 'Cliente ocasional'
  }
  const formatearFecha = (
    fecha,
  ) => {
    if (!fecha) {
      return '—'
    }

    return new Date(
      fecha,
    ).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })
  }

  const obtenerClaseEstado = (
    estadoVenta,
  ) => {
    if (
      estadoVenta === 'BORRADOR'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    if (
      estadoVenta === 'CONFIRMADA'
    ) {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    }

    if (estadoVenta === 'CANCELADA') {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-gray-100 text-gray-700'
  }

  const accionesVenta = (venta) => (
    <div className="flex flex-wrap gap-2" aria-label={`Acciones de la venta ${venta.id_venta}`}>
      <button type="button" onClick={() => abrirDetalle(venta)} disabled={cargandoDetalle} className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50">Ver</button>
        {venta.estado === 'BORRADOR' && <>
          {tienePermiso('pagos.crear') && (
            <button
              type="button"
              onClick={() => abrirCobroVenta(venta)}
              className="min-h-10 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Cobrar
            </button>
          )}
        {tienePermiso('ventas.confirmar') && <button type="button" onClick={() => abrirModalConfirmar(venta)} disabled={cargandoDetalle} className="min-h-10 rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-theme-brand-text hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50">Confirmar</button>}
        <button type="button" onClick={() => abrirFormulario(venta)} disabled={cargandoCatalogo || !catalogoDisponible || !tienePermiso('ventas.modificar')} title={!catalogoDisponible ? 'Pendiente de Catálogo.' : undefined} className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-50">Editar</button>
        {tienePermiso('ventas.anular') && <button type="button" onClick={() => abrirModalAnular(venta)} className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Anular</button>}
      </>}
      
    </div>
  )

  return (
    <main className="min-w-0 space-y-6 pb-10 text-theme-body">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
            Ventas
          </h1>

          <p className="mt-2 text-sm text-theme-muted">
            Registra ventas, realiza el cobro y confirma únicamente las operaciones pagadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirFormulario()}
          disabled={cargandoCatalogo || !catalogoDisponible || !tienePermiso('ventas.crear')}
          title={!catalogoDisponible ? 'Requiere presentaciones disponibles de Catálogo.' : undefined}
          className="min-h-11 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-theme-brand-text hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nueva venta
        </button>
      </div>

      {!catalogoDisponible && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {cargandoCatalogo
            ? 'Consultando presentaciones de Catálogo...'
            : `${errorCatalogo} El listado, consulta y anulación de ventas siguen disponibles.`}
          {!cargandoCatalogo && (
            <button type="button" onClick={cargarCatalogo} className="ml-3 font-semibold underline">
              Reintentar Catálogo
            </button>
          )}
        </div>
      )}

      {mensaje && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-theme-border-subtle bg-theme-surface p-4">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label
              htmlFor="estado_venta"
              className="mb-1.5 block text-sm font-medium text-theme-body"
            >
              Estado
            </label>

            <select
              id="estado_venta"
              value={estado}
              onChange={(event) => {
                setPagina(1)
                setEstado(event.target.value)
              }}
              className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
            >
              <option value="">Todas</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="CANCELADA">Anulada</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="fecha_venta"
              className="mb-1.5 block text-sm font-medium text-theme-body"
            >
              Fecha de venta
            </label>

            <input
              id="fecha_venta"
              type="date"
              value={fechaVenta}
              onChange={(event) => {
                setPagina(1)
                setFechaVenta(event.target.value)
              }}
              className="min-h-11 w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-sm text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
            />
          </div>

          <button
            type="button"
            disabled={!estado && !fechaVenta}
            onClick={() => {
              setPagina(1)
              setEstado('')
              setFechaVenta('')
            }}
            className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2.5 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
        {cargando ? (
          <div role="status" className="p-8 text-center text-theme-muted">
            Cargando ventas…
          </div>
        ) : ventas.length === 0 ? (
          <div className="p-8 text-center text-theme-muted">
            {error ? (
              <>
                <p>No se pudo mostrar el listado de ventas.</p>
                <button
                  type="button"
                  onClick={cargarVentas}
                  className="mt-3 font-semibold text-pink-700 underline"
                >
                  Reintentar ventas
                </button>
              </>
            ) : estado || fechaVenta
                ? 'No hay ventas que coincidan con los filtros seleccionados.'
                : 'Todavía no hay ventas registradas.'}
          </div>
        ) : (
          <>
          <div className="divide-y divide-theme-border-subtle 2xl:hidden">
            {ventas.map((venta) => <article key={venta.id_venta} className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="text-base font-semibold text-theme-heading">Venta #{venta.id_venta}</h2><p className="mt-1 break-words text-sm text-theme-body">{obtenerCliente(venta)}</p></div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(venta.estado)}`}>{venta.estado}</span>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-theme-muted">Total</dt><dd className="mt-1 font-semibold tabular-nums text-theme-heading">Bs {Number(venta.total ?? 0).toFixed(2)}</dd></div><div><dt className="text-theme-muted">Fecha</dt><dd className="mt-1 text-theme-body">{formatearFecha(venta.fecha_venta ?? venta.created_at)}</dd></div></dl>
              <div className="border-t border-theme-border-subtle pt-3">{accionesVenta(venta)}</div>
            </article>)}
          </div>
          <div className="hidden overflow-x-auto 2xl:block">
            <table className="w-full min-w-[1020px] divide-y divide-theme-border-subtle text-left">
              <thead className="bg-theme-subtle">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    N.º
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    Total
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    Fecha
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-theme-muted">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme-border-subtle">
                {ventas.map(
                  (venta) => (
                    <tr
                      key={
                        venta.id_venta
                      }
                      className="hover:bg-theme-subtle"
                    >
                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-theme-heading">
                        #
                        {
                          venta.id_venta
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {obtenerCliente(
                          venta,
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-theme-heading">
                        Bs{' '}
                        {Number(
                          venta.total ??
                            0,
                        ).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatearFecha(
                          venta.fecha_venta ??
                            venta.created_at,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(
                            venta.estado,
                          )}`}
                        >
                          {
                            venta.estado
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">{accionesVenta(venta)}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {paginacion && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-theme-muted">
          <span>
            Total:{' '}
            {paginacion.total}
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={
                paginacion.currentPage <=
                1
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    Math.max(
                      1,
                      actual - 1,
                    ),
                )
              }
              className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-40"
            >
              Anterior
            </button>

            <span>
              Página{' '}
              {
                paginacion.currentPage
              }{' '}
              de{' '}
              {paginacion.lastPage}
            </span>

            <button
              type="button"
              disabled={
                paginacion.currentPage >=
                paginacion.lastPage
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    actual + 1,
                )
              }
              className="min-h-10 rounded-lg border border-theme-border-subtle px-3 py-2 text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <VentaModal
        abierto={modalVentaAbierto}
        onCerrar={() => setModalVentaAbierto(false)}
        onGuardado={async (mensajeGuardado, esNueva, ventaGuardada) => {
          setMensaje(mensajeGuardado)
          if (esNueva && (estado !== '' || fechaVenta !== '' || pagina !== 1)) {
            setCargando(true)
            setVentas([])
            setPaginacion(null)
            setEstado('')
            setFechaVenta('')
            setPagina(1)
          } else {
            await cargarVentas()
            }

            if (
              esNueva &&
              ventaGuardada?.id_venta &&
              tienePermiso('pagos.crear')
            ) {
              await abrirCobroVenta(ventaGuardada)
            }
          }}
        clientes={clientes}
        errorClientes={errorClientes}
        presentaciones={presentaciones}
        venta={ventaParaEditar}
      />

      {ventaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="detalle-venta-titulo" className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-theme-border-subtle px-5 py-4 sm:px-6">
              <div>
                <h2 id="detalle-venta-titulo" className="text-xl font-semibold text-theme-heading">
                  Venta #
                  {
                    ventaSeleccionada.id_venta
                  }
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    ventaSeleccionada.estado
                  }
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar detalle de venta"
                onClick={() =>
                  setVentaSeleccionada(
                    null,
                  )
                }
                className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Cliente
                  </p>

                  <p className="mt-1 text-sm text-gray-900">
                    {obtenerCliente(
                      ventaSeleccionada,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Total
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-900">
                    Bs{' '}
                    {Number(
                      ventaSeleccionada.total ??
                        0,
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {ventaSeleccionada.fecha_confirmacion && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Fecha confirmación
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatearFecha(ventaSeleccionada.fecha_confirmacion)}
                    </p>
                  </div>
                  {ventaSeleccionada.operacion_stock_id && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Operación stock (Mostrador)
                      </p>
                      <p className="mt-1 font-mono text-xs text-emerald-700">
                        {ventaSeleccionada.operacion_stock_id}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Detalles
                </p>

                {ventaSeleccionada
                  .detalles?.length ? (
                  <div className="space-y-3">
                    {ventaSeleccionada.detalles.map(
                      (
                        detalle,
                      ) => (
                        <div
                          key={
                            detalle.id_detalle_venta
                          }
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          {(() => {
  const opcionCatalogo =
    presentaciones.find(
      (item) =>
        Number(item.presentacion_id) ===
        Number(detalle.presentacion_id),
    )

  const nombreProducto =
    detalle.nombre_producto_snapshot ||
    opcionCatalogo?.producto?.nombre ||
    'Producto'

  const nombrePresentacion =
    detalle.nombre_presentacion_snapshot ||
    opcionCatalogo?.nombre ||
    `Presentación #${detalle.presentacion_id}`

  return (
    <>
      <p className="font-semibold text-gray-900">
        {nombreProducto}
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Presentación:{' '}
        <span className="font-medium">
          {nombrePresentacion}
        </span>
      </p>
    </>
  )
})()}

                          <p className="mt-1 text-sm text-gray-600">
                            Cantidad:{' '}
                            {formatearCantidad(
                              detalle.cantidad
                            )}
                          </p>

                          <p className="text-sm text-gray-600">
                            Precio
                            unitario: Bs{' '}
                            {Number(
                              detalle.precio_unitario_snapshot ??
                                0,
                            ).toFixed(
                              2,
                            )}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            Subtotal: Bs{' '}
                            {Number(
                              detalle.subtotal ??
                                0,
                            ).toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Sin detalles.
                  </p>
                )}
              </div>

              {ventaSeleccionada.observaciones && (
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Observaciones
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {
                      ventaSeleccionada.observaciones
                    }
                  </p>
                </div>
              )}

              {ventaSeleccionada.estado === 'BORRADOR' && (
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4">
                  {tienePermiso('ventas.modificar') && (
                    <button
                      type="button"
                      onClick={() => {
                        const v = ventaSeleccionada
                        setVentaSeleccionada(null)
                        abrirFormulario(v)
                      }}
                      disabled={cargandoCatalogo || !catalogoDisponible}
                      className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Editar
                    </button>
                  )}
                  {tienePermiso('pagos.crear') && (
                    <button
                      type="button"
                      onClick={() => {
                        const v = ventaSeleccionada
                        setVentaSeleccionada(null)
                        abrirCobroVenta(v)
                      }}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Cobrar venta
                    </button>
                  )}

                  {tienePermiso('ventas.confirmar') && (
                    <button
                      type="button"
                      onClick={() => {
                        const v = ventaSeleccionada
                        setVentaSeleccionada(null)
                        abrirModalConfirmar(v)
                      }}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Confirmar venta
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {ventaParaAnular && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="anular-venta-titulo" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
            <div className="border-b border-theme-border-subtle px-5 py-4 sm:px-6">
              <h2 id="anular-venta-titulo" className="text-xl font-semibold text-theme-heading">
                Anular venta
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Venta #
                {
                  ventaParaAnular.id_venta
                }
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {errorAnulacion && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorAnulacion}
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Solo las ventas en estado borrador pueden ser anuladas.
              </div>

              <div>
                <label htmlFor="motivo-anulacion" className="mb-1.5 block text-sm font-medium text-theme-body">
                  Motivo de
                  anulación
                </label>

                <textarea
                  id="motivo-anulacion"
                  value={
                    motivoAnulacion
                  }
                  onChange={(event) =>
                    setMotivoAnulacion(
                      event.target
                        .value,
                    )
                  }
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2.5 text-theme-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={
                    cerrarModalAnular
                  }
                  disabled={
                    anulando
                  }
                  className="min-h-11 rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    confirmarAnulacion
                  }
                  disabled={
                    anulando ||
                    motivoAnulacion
                      .trim()
                      .length < MIN_MOTIVO_ANULACION
                  }
                  className="min-h-11 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                >
                  {anulando
                    ? 'Anulando...'
                    : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PagoModal
        abierto={modalPagoAbierto}
        onCerrar={cerrarModalPago}
        onGuardado={manejarPagoGuardado}
        ventas={ventasParaPago}
        pedidos={[]}
        metodosPago={metodosPago}
        ventaInicialId={ventaPagoInicialId}
      />

      <ReciboDetalleModal
        abierto={Boolean(
          reciboSeleccionado,
        )}
        reciboId={reciboSeleccionado}
        onCerrar={() =>
          setReciboSeleccionado(null)
        }
        onActualizado={() =>
          cargarVentas()
        }
      />

      <ConfirmarVentaModal
        abierto={Boolean(ventaParaConfirmar)}
        venta={ventaParaConfirmar}
        onCerrar={cerrarModalConfirmar}
        onConfirmado={async (mensajeExito, ventaConfirmada) => {
            setMensaje(mensajeExito)

            if (
              ventaSeleccionada &&
              ventaConfirmada &&
              ventaSeleccionada.id_venta === ventaConfirmada.id_venta
            ) {
              setVentaSeleccionada(ventaConfirmada)
            }

            await cargarVentas()

              if (!ventaConfirmada?.id_venta) return

              try {
                const resumen = await consultarPagosOrigen(
                  'VENTA',
                  ventaConfirmada.id_venta,
                )

                const pagos = (resumen.pagos ?? [])
                  .filter((pago) => pago.estado === 'CONFIRMADO')
                  .sort((a, b) => Number(b.id_pago) - Number(a.id_pago))

                if (pagos.length > 0) {
                  await abrirReciboPago(mensajeExito, pagos[0])
                }
              } catch (errorPeticion) {
                setError(
                  'La venta fue confirmada, pero no se pudo abrir el recibo: ' +
                    (errorPeticion.message || ''),
                )
              }

          }}
        tienePermisoInventario={tienePermiso('inventario.ver')}
      />
    </main>
  )
}

export default VentasPage

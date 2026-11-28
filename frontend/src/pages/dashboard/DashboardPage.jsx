import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { obtenerResumenDashboard } from '../../services/dashboardService'
import DashboardKpiCard from '../../components/dashboard/DashboardKpiCard'
import GraficoTendenciaVentas from '../../components/dashboard/GraficoTendenciaVentas'
import GraficoTopProductos from '../../components/dashboard/GraficoTopProductos'
import GraficoEstadosPedidos from '../../components/dashboard/GraficoEstadosPedidos'

const formatoMoneda = (valor) => `Bs. ${Number(valor || 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`

const panelClass = 'min-w-0 rounded-2xl border border-theme-border-subtle bg-theme-surface p-4 sm:p-6'
const panelLinkClass = 'shrink-0 rounded-md text-sm font-semibold text-pink-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-600'

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState('mes')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const solicitudActual = useRef(0)

  const cargarDatosDashboard = useCallback(async (p) => {
    const solicitud = ++solicitudActual.current
    try {
      setCargando(true)
      setError(null)
      const res = await obtenerResumenDashboard({ periodo: p })
      if (solicitud === solicitudActual.current) setDatos(res)
    } catch (err) {
      if (solicitud === solicitudActual.current) {
        setDatos(null)
        setError(err.message || 'No se pudieron cargar los datos del dashboard.')
      }
    } finally {
      if (solicitud === solicitudActual.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatosDashboard(periodo)
    return () => { solicitudActual.current += 1 }
  }, [periodo, cargarDatosDashboard])

  const kpis = datos?.kpis || {}
  const graficos = datos?.graficos || {}
  const tablas = datos?.tablas || {}

  const opcionesPeriodo = [
    { id: 'hoy', etiqueta: 'Hoy' },
    { id: '7d', etiqueta: '7 días' },
    { id: 'mes', etiqueta: 'Este mes' },
    { id: 'anio', etiqueta: 'Este año' },
  ]

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 text-theme-body" aria-busy={cargando}>
      {/* 1. Cabecera y Selector de Período */}
      <header className="flex flex-col gap-5 border-b border-theme-border-subtle pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
            Resumen del negocio
          </h1>
          <p className="mt-2 text-sm text-theme-muted">
            Ventas, pedidos e inventario en un solo lugar
            {datos?.periodo?.descripcion ? ` · ${datos.periodo.descripcion}` : ''}.
          </p>
        </div>

        {/* Filtro de Rango Temporal */}
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Período del resumen" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-theme-border-subtle bg-theme-surface p-1">
          {opcionesPeriodo.map((op) => (
            <button
              key={op.id}
              type="button"
              aria-pressed={periodo === op.id}
              onClick={() => setPeriodo(op.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                periodo === op.id
                  ? 'bg-pink-600 text-theme-brand-text'
                  : 'text-theme-body hover:bg-theme-hover'
              }`}
            >
              <span>{op.etiqueta}</span>
            </button>
          ))}
          </div>

          <button
            type="button"
            onClick={() => cargarDatosDashboard(periodo)}
            title="Actualizar resumen"
            aria-label="Actualizar resumen"
            disabled={cargando}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme-border-subtle bg-theme-surface text-theme-body transition-colors hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-wait disabled:opacity-50"
          >
            <svg
              className={`h-5 w-5 ${cargando ? 'animate-spin text-pink-600' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Mensaje de Error */}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-3">
            <p>No se pudo actualizar el resumen. {error}</p>
          </div>
          <button
            type="button"
            onClick={() => cargarDatosDashboard(periodo)}
            className="rounded-lg px-3 py-2 font-semibold underline underline-offset-4 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && <>
      {/* 2. Tarjetas de KPIs Principales */}
      <section aria-label="Indicadores principales" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1: Ventas */}
        <DashboardKpiCard
          className="sm:col-span-2 lg:col-span-2"
          destacado
          titulo="Ventas del período"
          valor={formatoMoneda(kpis.ventas_total)}
          subtitulo={`${kpis.ventas_cantidad || 0} ${kpis.ventas_cantidad === 1 ? 'venta realizada' : 'ventas realizadas'}`}
          variante="primary"
          cargando={cargando}
          badge={{
            texto: `Hoy: ${formatoMoneda(kpis.ventas_hoy)}`,
            tipo: 'info',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* KPI 2: Pedidos Activos */}
        <DashboardKpiCard
          titulo="Pedidos activos"
          valor={kpis.pedidos_activos ?? 0}
          subtitulo={`${kpis.pedidos_en_proceso || 0} en proceso · ${kpis.pedidos_programados || 0} programados`}
          variante="warning"
          cargando={cargando}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        {/* KPI 3: Producción */}
        <DashboardKpiCard
          titulo="Producciones realizadas"
          valor={kpis.produccion_finalizada ?? 0}
          subtitulo="Completadas en el período"
          variante="info"
          cargando={cargando}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        />

        {/* KPI 4: Alertas de Stock */}
        <DashboardKpiCard
          titulo="Stock bajo"
          valor={kpis.alertas_stock ?? 0}
          subtitulo="Artículos con 5 o menos unidades"
          variante={kpis.alertas_stock > 0 ? 'amber' : 'success'}
          cargando={cargando}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        {/* KPI 5: Ganancia Bruta */}
        <DashboardKpiCard
          titulo="Ganancia bruta"
          valor={formatoMoneda(kpis.ganancia_bruta)}
          subtitulo={`Costo de ventas: ${formatoMoneda(kpis.costo_ventas)}`}
          variante="success"
          cargando={cargando}
          badge={{
            texto: (kpis.cobertura_costos || 0) >= 100
              ? `Margen: ${Number(kpis.margen_bruto || 0).toFixed(1)}%`
              : `Cobertura: ${Number(kpis.cobertura_costos || 0).toFixed(1)}%`,
            tipo: (kpis.cobertura_costos || 0) >= 100 ? 'success' : 'warning',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M17 5l2 2-4 4" />
            </svg>
          }
        />
      </section>

      <div>
        <h2 className="text-lg font-semibold text-theme-heading">Análisis y operación</h2>
        <p className="mt-1 text-sm text-theme-muted">Tendencias, entregas y actividad reciente del negocio.</p>
      </div>
      <div className="grid min-w-0 gap-4">
        {/* Tendencia y tablas de operación */}
        <div className="min-w-0 space-y-4">
          {/* Card: Tendencia de Ventas */}
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-theme-heading">
                  Tendencia de ventas
                </h3>
                <p className="mt-1 text-sm text-theme-muted">
                  Ingresos registrados en el período
                </p>
              </div>
              <span className="text-xs font-medium text-theme-muted">
                Montos en Bs.
              </span>
            </div>

            <GraficoTendenciaVentas datos={graficos.tendencia_ventas} cargando={cargando} />
          </div>

          {/* Card: Próximos Pedidos a Entregar */}
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-theme-heading">
                  Próximas entregas
                </h3>
                <p className="mt-1 text-sm text-theme-muted">
                  Pedidos agendados pendientes de entrega
                </p>
              </div>
              <Link
                to="/pedidos"
                className={panelLinkClass}
              >
                Ver pedidos →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-theme-border-subtle text-xs text-theme-muted">
                    <th className="pb-3 font-semibold">Pedido</th>
                    <th className="pb-3 font-semibold">Cliente</th>
                    <th className="pb-3 font-semibold">Entrega</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Saldo</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border-subtle">
                  {cargando ? (
                    <tr><td colSpan={6} className="py-6 text-center text-theme-muted">Cargando entregas…</td></tr>
                  ) : tablas.proximos_pedidos?.length > 0 ? (
                    tablas.proximos_pedidos.map((pedido) => (
                      <tr key={pedido.id_pedido} className="transition-colors hover:bg-theme-subtle">
                        <td className="py-3 font-mono font-bold text-slate-900">
                          #{pedido.id_pedido}
                        </td>
                        <td className="py-3 font-medium text-slate-800">
                          {pedido.cliente}
                        </td>
                        <td className="py-3 text-slate-600">
                          {pedido.fecha_entrega} <span className="text-[11px] text-slate-400">({pedido.hora_entrega})</span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          {formatoMoneda(pedido.total)}
                        </td>
                        <td className="py-3 text-right font-bold">
                          {pedido.saldo > 0 ? (
                            <span className="text-amber-600">
                              {formatoMoneda(pedido.saldo)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">
                              Pagado
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              pedido.estado === 'EN_PROCESO'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {pedido.estado === 'EN_PROCESO' ? 'En proceso' : pedido.estado === 'PROGRAMADO' ? 'Programado' : pedido.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No hay pedidos próximos pendientes de entrega.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Últimas Ventas */}
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-theme-heading">
                  Ventas recientes
                </h3>
                <p className="mt-1 text-sm text-theme-muted">
                  Últimas operaciones registradas
                </p>
              </div>
              <Link
                to="/ventas"
                className={panelLinkClass}
              >
                Ver ventas →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-theme-border-subtle text-xs text-theme-muted">
                    <th className="pb-3 font-semibold">Venta</th>
                    <th className="pb-3 font-semibold">Cliente</th>
                    <th className="pb-3 font-semibold">Fecha / Hora</th>
                    <th className="pb-3 font-semibold">Vendedor</th>
                    <th className="pb-3 font-semibold text-right">Monto</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border-subtle">
                  {cargando ? (
                    <tr><td colSpan={6} className="py-6 text-center text-theme-muted">Cargando ventas…</td></tr>
                  ) : tablas.ultimas_ventas?.length > 0 ? (
                    tablas.ultimas_ventas.map((venta) => (
                      <tr key={venta.id_venta} className="transition-colors hover:bg-theme-subtle">
                        <td className="py-3 font-mono font-bold text-slate-900">
                          #{venta.id_venta}
                        </td>
                        <td className="py-3 font-medium text-slate-800">
                          {venta.cliente}
                        </td>
                        <td className="py-3 text-slate-600">
                          {venta.fecha_venta || '-'}
                        </td>
                        <td className="py-3 text-slate-500">
                          {venta.vendedor}
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">
                          {formatoMoneda(venta.total)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              venta.estado === 'REGISTRADA'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {venta.estado === 'REGISTRADA' ? 'Registrada' : venta.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No hay ventas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Productos, pedidos e inventario */}
        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
          {/* Card: Top 5 Productos */}
          <div className={panelClass}>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-theme-heading">
                Productos más vendidos
              </h3>
              <p className="mt-1 text-sm text-theme-muted">
                Por unidades vendidas en el período
              </p>
            </div>

            <GraficoTopProductos
              datos={graficos.top_productos}
              cargando={cargando}
            />
          </div>

          {/* Card: Distribución de Estados de Pedidos */}
          <div className={panelClass}>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-theme-heading">
                Estado de pedidos
              </h3>
              <p className="mt-1 text-sm text-theme-muted">
                Distribución por etapa del pedido
              </p>
            </div>

            <GraficoEstadosPedidos
              datos={graficos.estados_pedidos}
              cargando={cargando}
            />
          </div>

          {/* Card: Alertas de Stock Bajo */}
          <div className={panelClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-theme-heading">
                  Stock bajo
                </h3>
                <p className="mt-1 text-sm text-theme-muted">
                  Artículos con 5 o menos unidades
                </p>
              </div>
              <Link
                to="/almacenes"
                className={panelLinkClass}
              >
                Inventario →
              </Link>
            </div>

            <div className="divide-y divide-theme-border-subtle">
              {cargando ? (
                <p className="py-6 text-center text-sm text-theme-muted">Cargando existencias…</p>
              ) : tablas.stock_bajo?.length > 0 ? (
                tablas.stock_bajo.map((item) => (
                  <div
                    key={item.id_inventario}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="truncate pr-2">
                      <p className="truncate text-sm font-medium text-theme-heading">
                        {item.nombre}
                      </p>
                      <p className="text-xs text-theme-muted">
                        {item.almacen} {item.detalle ? `• ${item.detalle}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {item.cantidad} disponibles
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="mt-1 text-sm text-theme-muted">
                    Sin alertas de stock bajo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Resumen de Almacenes */}
          <div className={panelClass}>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-theme-heading">
                Existencias por almacén
              </h3>
              <p className="mt-1 text-sm text-theme-muted">
                Inventario consolidado
              </p>
            </div>

            <div className="divide-y divide-theme-border-subtle">
              {cargando ? <p className="py-6 text-center text-sm text-theme-muted">Cargando almacenes…</p> : graficos.almacenes?.length ? graficos.almacenes.map((alm) => (
                <div
                  key={alm.id_almacen}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-theme-heading">
                      {alm.nombre}
                    </span>
                    <span className="text-xs text-theme-muted">
                      {alm.total_items} artículos
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-theme-muted">
                    <span>Stock total: <strong className="tabular-nums text-theme-body">{Number(alm.stock_total || 0).toFixed(1)}</strong></span>
                    {alm.stock_critico > 0 ? (
                      <span className="font-semibold text-pink-600">
                        {alm.stock_critico} críticos
                      </span>
                    ) : (
                      <span className="text-emerald-600">Normal</span>
                    )}
                  </div>
                </div>
              )) : <p className="py-6 text-center text-sm text-theme-muted">No hay almacenes para mostrar.</p>}
            </div>
          </div>
        </div>
      </div>
      </>}
    </main>
  )
}

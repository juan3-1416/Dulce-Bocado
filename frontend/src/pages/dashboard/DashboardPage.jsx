import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { obtenerResumenDashboard } from '../../services/dashboardService'
import DashboardKpiCard from '../../components/dashboard/DashboardKpiCard'
import GraficoTendenciaVentas from '../../components/dashboard/GraficoTendenciaVentas'
import GraficoTopProductos from '../../components/dashboard/GraficoTopProductos'
import GraficoEstadosPedidos from '../../components/dashboard/GraficoEstadosPedidos'

export default function DashboardPage() {
  const { tienePermiso } = useAuth()
  const [periodo, setPeriodo] = useState('mes')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDatosDashboard(periodo)
  }, [periodo])

  const cargarDatosDashboard = async (p) => {
    try {
      setCargando(true)
      setError(null)
      const res = await obtenerResumenDashboard({ periodo: p })
      setDatos(res)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
      setError(err.message || 'No se pudieron cargar los datos del dashboard.')
    } finally {
      setCargando(false)
    }
  }

  const kpis = datos?.kpis || {}
  const graficos = datos?.graficos || {}
  const tablas = datos?.tablas || {}

  const opcionesPeriodo = [
    { id: 'hoy', etiqueta: 'Hoy', icono: '☀️' },
    { id: '7d', etiqueta: 'Últimos 7 Días', icono: '📅' },
    { id: 'mes', etiqueta: 'Este Mes', icono: '📊' },
    { id: 'anio', etiqueta: 'Todo el Año', icono: '📈' },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Cabecera y Selector de Período */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard Administrativo
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Métricas clave, volumen de ventas, pedidos y existencias en tiempo real
            {datos?.periodo?.descripcion ? ` — ${datos.periodo.descripcion}` : ''}
          </p>
        </div>

        {/* Filtro de Rango Temporal */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
          {opcionesPeriodo.map((op) => (
            <button
              key={op.id}
              onClick={() => setPeriodo(op.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                periodo === op.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{op.icono}</span>
              <span>{op.etiqueta}</span>
            </button>
          ))}

          <button
            onClick={() => cargarDatosDashboard(periodo)}
            title="Recargar datos"
            disabled={cargando}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              className={`h-4 w-4 ${cargando ? 'animate-spin text-pink-600' : ''}`}
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
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
          <button
            onClick={() => cargarDatosDashboard(periodo)}
            className="rounded-lg bg-red-100 px-3 py-1 font-semibold text-red-800 hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 2. Tarjetas de KPIs Principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Ventas */}
        <DashboardKpiCard
          titulo="Ventas Período"
          valor={`Bs. ${(kpis.ventas_total || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitulo={`${kpis.ventas_cantidad || 0} ${kpis.ventas_cantidad === 1 ? 'venta realizada' : 'ventas realizadas'}`}
          variante="primary"
          cargando={cargando}
          badge={{
            texto: `Hoy: Bs. ${(kpis.ventas_hoy || 0).toFixed(2)}`,
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
          titulo="Pedidos Activos"
          valor={kpis.pedidos_activos ?? 0}
          subtitulo={`${kpis.pedidos_en_proceso || 0} en proceso / ${kpis.pedidos_programados || 0} prog.`}
          variante="warning"
          cargando={cargando}
          badge={{
            texto: `${kpis.pedidos_en_proceso || 0} listos/proc.`,
            tipo: 'warning',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        {/* KPI 3: Producción */}
        <DashboardKpiCard
          titulo="Producción Activa"
          valor={kpis.produccion_activa ?? 0}
          subtitulo={`${kpis.produccion_finalizada || 0} completadas en período`}
          variante="info"
          cargando={cargando}
          badge={{
            texto: `${kpis.produccion_activa || 0} en curso`,
            tipo: 'info',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        />

        {/* KPI 4: Alertas de Stock */}
        <DashboardKpiCard
          titulo="Alertas Stock"
          valor={kpis.alertas_stock ?? 0}
          subtitulo="Artículos con ≤ 5 existencias"
          variante={kpis.alertas_stock > 0 ? 'amber' : 'success'}
          cargando={cargando}
          badge={{
            texto: kpis.alertas_stock > 0 ? 'Atención req.' : 'Stock óptimo',
            tipo: kpis.alertas_stock > 0 ? 'danger' : 'success',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        {/* KPI 5: Visitas & Clientes */}
        <DashboardKpiCard
          titulo="Visitas & Tráfico"
          valor={kpis.total_visitas ?? 0}
          subtitulo={`${kpis.total_clientes || 0} clientes registrados`}
          variante="purple"
          cargando={cargando}
          badge={{
            texto: `${kpis.total_clientes || 0} clientes`,
            tipo: 'neutral',
          }}
          icono={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
      </div>

      {/* 3. Sección Principal de Análisis: Gráficos y Tablas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna Izquierda (2/3): Tendencia y Tablas de Operación */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Tendencia de Ventas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Evolución y Tendencia de Ventas
                </h2>
                <p className="text-xs text-slate-500">
                  Histórico de ingresos brutos por período seleccionado
                </p>
              </div>
              <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Bs. Bolivianos
              </span>
            </div>

            <GraficoTendenciaVentas
              datos={graficos.tendencia_ventas}
              periodo={periodo}
              cargando={cargando}
            />
          </div>

          {/* Card: Próximos Pedidos a Entregar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Próximas Entregas de Pedidos
                </h2>
                <p className="text-xs text-slate-500">
                  Pedidos agendados pendientes de entrega y cobro
                </p>
              </div>
              <Link
                to="/pedidos"
                className="text-xs font-bold text-pink-600 hover:text-pink-700"
              >
                Ver todos →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Pedido</th>
                    <th className="pb-3 font-semibold">Cliente</th>
                    <th className="pb-3 font-semibold">Entrega</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Saldo</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablas.proximos_pedidos?.length > 0 ? (
                    tablas.proximos_pedidos.map((pedido) => (
                      <tr key={pedido.id_pedido} className="transition-colors hover:bg-slate-50">
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
                          Bs. {pedido.total.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-bold">
                          {pedido.saldo > 0 ? (
                            <span className="text-amber-600">
                              Bs. {pedido.saldo.toFixed(2)}
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
                            {pedido.estado}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Operaciones Comerciales Recientes
                </h2>
                <p className="text-xs text-slate-500">
                  Últimas ventas procesadas en caja o mostrador
                </p>
              </div>
              <Link
                to="/ventas"
                className="text-xs font-bold text-pink-600 hover:text-pink-700"
              >
                Ver ventas →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Venta</th>
                    <th className="pb-3 font-semibold">Cliente</th>
                    <th className="pb-3 font-semibold">Fecha / Hora</th>
                    <th className="pb-3 font-semibold">Vendedor</th>
                    <th className="pb-3 font-semibold text-right">Monto</th>
                    <th className="pb-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablas.ultimas_ventas?.length > 0 ? (
                    tablas.ultimas_ventas.map((venta) => (
                      <tr key={venta.id_venta} className="transition-colors hover:bg-slate-50">
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
                          Bs. {venta.total.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              venta.estado === 'REGISTRADA'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {venta.estado}
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

        {/* Columna Derecha (1/3): Rankings, Estados y Alertas */}
        <div className="space-y-6">
          {/* Card: Top 5 Productos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Top 5 Productos Más Vendidos
              </h2>
              <p className="text-xs text-slate-500">
                Ranking según unidades despachadas en el período
              </p>
            </div>

            <GraficoTopProductos
              datos={graficos.top_productos}
              cargando={cargando}
            />
          </div>

          {/* Card: Distribución de Estados de Pedidos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Estado de Pedidos
              </h2>
              <p className="text-xs text-slate-500">
                Distribución porcentual por etapa del pedido
              </p>
            </div>

            <GraficoEstadosPedidos
              datos={graficos.estados_pedidos}
              cargando={cargando}
            />
          </div>

          {/* Card: Alertas de Stock Bajo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Alertas de Stock Bajo
                </h2>
                <p className="text-xs text-slate-500">
                  Existencias críticas (≤ 5 unidades)
                </p>
              </div>
              <Link
                to="/almacenes"
                className="text-xs font-bold text-pink-600 hover:text-pink-700"
              >
                Inventario →
              </Link>
            </div>

            <div className="space-y-2.5">
              {tablas.stock_bajo?.length > 0 ? (
                tablas.stock_bajo.map((item) => (
                  <div
                    key={item.id_inventario}
                    className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50 p-3"
                  >
                    <div className="truncate pr-2">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.almacen} {item.detalle ? `• ${item.detalle}` : ''}
                      </p>
                    </div>
                    <span className="rounded-lg bg-pink-100 px-2 py-1 text-xs font-black text-pink-700 shrink-0">
                      {item.cantidad} disp.
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    No hay alertas de stock bajo en este momento.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Resumen de Almacenes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Almacenes y Existencias
              </h2>
              <p className="text-xs text-slate-500">
                Resumen de inventario consolidado por almacén
              </p>
            </div>

            <div className="space-y-3">
              {graficos.almacenes?.map((alm) => (
                <div
                  key={alm.id_almacen}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {alm.nombre}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {alm.total_items} items
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Stock Total: <strong className="text-slate-800">{Number(alm.stock_total).toFixed(1)}</strong></span>
                    {alm.stock_critico > 0 ? (
                      <span className="font-semibold text-pink-600">
                        {alm.stock_critico} en nivel crítico
                      </span>
                    ) : (
                      <span className="text-emerald-600">Normal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

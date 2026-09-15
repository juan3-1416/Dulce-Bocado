export default function GraficoEstadosPedidos({ datos = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-pink-600 border-t-transparent"></div>
      </div>
    )
  }

  const configuracionEstados = {
    PROGRAMADO: {
      nombre: 'Programado',
      color: '#f59e0b',
      badge: 'bg-amber-100 text-amber-800',
    },
    EN_PROCESO: {
      nombre: 'En Proceso',
      color: '#0284c7',
      badge: 'bg-sky-100 text-sky-800',
    },
    ENTREGADO: {
      nombre: 'Entregado',
      color: '#10b981',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    CANCELADO: {
      nombre: 'Cancelado',
      color: '#ef4444',
      badge: 'bg-red-100 text-red-800',
    },
  }

  const totalPedidos = datos.reduce((acc, d) => acc + d.cantidad, 0)

  if (totalPedidos === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-400">
        <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="mt-2 text-sm">No hay pedidos registrados en este período.</p>
      </div>
    )
  }

  // Parámetros Donut SVG
  const radio = 40
  const circunferencia = 2 * Math.PI * radio
  let acumuladorPorcentaje = 0

  return (
    <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
      {/* Donut Chart SVG */}
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          {/* Círculo base de fondo */}
          <circle
            cx="50"
            cy="50"
            r={radio}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="14"
            className="text-slate-100"
          />

          {/* Segmentos del Donut */}
          {datos.map((item, idx) => {
            const porcentaje = item.cantidad / totalPedidos
            const dashArray = `${porcentaje * circunferencia} ${circunferencia}`
            const dashOffset = -acumuladorPorcentaje * circunferencia
            acumuladorPorcentaje += porcentaje

            const config = configuracionEstados[item.estado] || {
              nombre: item.estado,
              color: '#64748b',
            }

            return (
              <circle
                key={item.estado || idx}
                cx="50"
                cy="50"
                r={radio}
                fill="transparent"
                stroke={config.color}
                strokeWidth="14"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700 ease-out"
              />
            )
          })}
        </svg>

        {/* Centro del Donut con total */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-800">
            {totalPedidos}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Pedidos
          </span>
        </div>
      </div>

      {/* Leyenda interactiva */}
      <div className="flex flex-1 flex-col gap-2.5 w-full max-w-xs">
        {datos.map((item, idx) => {
          const config = configuracionEstados[item.estado] || {
            nombre: item.estado,
            color: '#64748b',
            badge: 'bg-slate-100 text-slate-700',
          }
          const porcentaje = Math.round((item.cantidad / totalPedidos) * 100)

          return (
            <div
              key={item.estado || idx}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-all hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs font-semibold text-slate-700">
                  {config.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {item.cantidad}
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs">
                  {porcentaje}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

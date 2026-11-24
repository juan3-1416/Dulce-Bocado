export default function GraficoEstadosPedidos({ datos = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center" aria-label="Cargando estados de pedidos">
        <div className="h-36 w-36 rounded-full bg-theme-subtle" />
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
      <div className="flex h-64 flex-col items-center justify-center text-theme-muted">
        <svg aria-hidden="true" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="mt-2 text-sm">No hay pedidos registrados en este período.</p>
      </div>
    )
  }

  // Parámetros Donut SVG
  const radio = 40
  const circunferencia = 2 * Math.PI * radio

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {/* Donut Chart SVG */}
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform" role="img" aria-label={`Distribución de ${totalPedidos} pedidos por estado`}>
          {/* Círculo base de fondo */}
          <circle
            cx="50"
            cy="50"
            r={radio}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="14"
            className="text-theme-subtle"
          />

          {/* Segmentos del Donut */}
          {datos.map((item, idx) => {
            const porcentaje = item.cantidad / totalPedidos
            const dashArray = `${porcentaje * circunferencia} ${circunferencia}`
            const porcentajeAnterior = datos.slice(0, idx).reduce((acc, anterior) => acc + anterior.cantidad, 0) / totalPedidos
            const dashOffset = -porcentajeAnterior * circunferencia

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
          <span className="text-2xl font-semibold tabular-nums text-theme-heading">
            {totalPedidos}
          </span>
          <span className="text-xs text-theme-muted">
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
              className="flex items-center justify-between border-b border-theme-border-subtle py-2.5 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm text-theme-body">
                  {config.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-theme-heading">
                  {item.cantidad}
                </span>
                <span className="text-xs tabular-nums text-theme-muted">
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

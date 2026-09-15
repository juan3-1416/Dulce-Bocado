import { useState } from 'react'

export default function GraficoTendenciaVentas({ datos = [], periodo = 'mes', cargando = false }) {
  const [puntoActivo, setPuntoActivo] = useState(null)

  if (cargando) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-600 border-t-transparent"></div>
          <p className="text-xs text-slate-400">Cargando tendencia de ventas...</p>
        </div>
      </div>
    )
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-slate-400">
        <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="mt-2 text-sm">No hay registros de ventas para el período seleccionado.</p>
      </div>
    )
  }

  const valores = datos.map((d) => d.total)
  const maxValor = Math.max(...valores, 100)
  const totalPeriodo = valores.reduce((acc, curr) => acc + curr, 0)
  const promedio = valores.length > 0 ? totalPeriodo / valores.length : 0

  // Dimensiones SVG
  const width = 700
  const height = 240
  const paddingBottom = 40
  const paddingTop = 20
  const paddingLeft = 10
  const paddingRight = 10

  const chartHeight = height - paddingBottom - paddingTop
  const chartWidth = width - paddingLeft - paddingRight
  const barWidth = Math.max(8, Math.min(32, (chartWidth / datos.length) * 0.6))
  const step = chartWidth / datos.length

  return (
    <div className="flex flex-col">
      {/* Cabecera del gráfico con métricas resumen */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total en Período
          </span>
          <p className="text-xl font-black text-pink-600">
            Bs. {totalPeriodo.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Promedio Diario/Período
          </span>
          <p className="text-sm font-bold text-slate-800">
            Bs. {promedio.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Gráfico SVG Reactivo */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible transition-all duration-300"
          style={{ maxHeight: '260px' }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="1" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Líneas de cuadrícula horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio)
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              </g>
            )
          })}

          {/* Barras de datos */}
          {datos.map((d, index) => {
            const x = paddingLeft + index * step + step / 2
            const barH = (d.total / maxValor) * chartHeight
            const y = paddingTop + chartHeight - barH
            const esActivo = puntoActivo?.clave === d.clave

            const mostrarEtiqueta =
              datos.length <= 12 ||
              index % Math.ceil(datos.length / 10) === 0 ||
              index === datos.length - 1

            return (
              <g
                key={d.clave || index}
                className="cursor-pointer"
                onMouseEnter={() => setPuntoActivo(d)}
                onMouseLeave={() => setPuntoActivo(null)}
              >
                {/* Zona de hover amplia */}
                <rect
                  x={x - step / 2}
                  y={paddingTop}
                  width={step}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Barra de valor */}
                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 3)}
                  rx={barWidth / 2}
                  fill={esActivo ? 'url(#barGradientHover)' : 'url(#barGradient)'}
                  className="transition-all duration-200"
                />

                {/* Etiqueta Eje X */}
                {mostrarEtiqueta && (
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-medium select-none"
                  >
                    {d.etiqueta}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {puntoActivo && (
          <div
            className="pointer-events-none absolute top-0 right-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-150"
          >
            <p className="font-bold text-slate-900">{puntoActivo.etiqueta}</p>
            <div className="mt-1 flex items-center justify-between gap-4">
              <span className="text-slate-500">Total:</span>
              <span className="font-bold text-pink-600">
                Bs. {Number(puntoActivo.total).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Transacciones:</span>
              <span className="font-medium text-slate-800">
                {puntoActivo.cantidad} {puntoActivo.cantidad === 1 ? 'venta' : 'ventas'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

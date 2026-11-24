export default function GraficoTopProductos({ datos = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-pink-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-400">
        <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <p className="mt-2 text-sm">No hay productos vendidos en este período.</p>
      </div>
    )
  }

  const maxUnidades = Math.max(...datos.map((d) => d.unidades), 1)

  const medallas = ['🥇', '🥈', '🥉', '4°', '5°']
  const coloresBarras = [
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-sky-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-purple-500 to-indigo-500',
  ]

  return (
    <div className="space-y-4">
      {datos.map((item, index) => {
        const porcentaje = Math.round((item.unidades / maxUnidades) * 100)
        const gradiente = coloresBarras[index % coloresBarras.length]

        return (
          <div key={item.id_producto_presentacion || index} className="group">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">
                  {medallas[index]}
                </span>
                <span className="truncate text-slate-800">
                  {item.producto}
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({item.presentacion})
                </span>
              </div>
              <div className="flex items-center gap-3 text-right shrink-0">
                <span className="font-bold text-slate-700">
                  {item.unidades} {item.unidades === 1 ? 'ud.' : 'uds.'}
                </span>
                <span className="font-bold text-pink-600 min-w-[70px]">
                  Bs. {Number(item.monto).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradiente} transition-all duration-500 ease-out`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

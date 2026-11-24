export default function GraficoTopProductos({ datos = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="h-64 animate-pulse space-y-5 pt-4" aria-label="Cargando productos más vendidos">
        {[1, 2, 3, 4].map((fila) => <div className="space-y-2" key={fila}><div className="h-4 w-3/4 rounded bg-theme-hover" /><div className="h-2 rounded bg-theme-subtle" /></div>)}
      </div>
    )
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-theme-muted">
        <svg aria-hidden="true" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <p className="mt-2 text-sm">No hay productos vendidos en este período.</p>
      </div>
    )
  }

  const maxUnidades = Math.max(...datos.map((d) => d.unidades), 1)

  return (
    <div className="space-y-5">
      {datos.map((item, index) => {
        const porcentaje = Math.round((item.unidades / maxUnidades) * 100)

        return (
          <div key={item.id_producto_presentacion || index} className="group">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-theme-subtle text-xs font-semibold tabular-nums text-theme-muted">
                  {index + 1}
                </span>
                <div className="min-w-0"><p className="truncate font-medium text-theme-heading">{item.producto}</p><p className="truncate text-xs text-theme-muted">{item.presentacion}</p></div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="font-semibold text-theme-heading">{item.unidades} {item.unidades === 1 ? 'unidad' : 'unidades'}</p>
                <p className="text-xs text-theme-muted">Bs. {Number(item.monto).toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-theme-subtle" aria-hidden="true">
              <div
                className="h-full rounded-full bg-pink-600"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

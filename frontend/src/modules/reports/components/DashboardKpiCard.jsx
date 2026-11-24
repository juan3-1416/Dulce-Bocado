export default function DashboardKpiCard({
  titulo,
  valor,
  subtitulo,
  icono,
  variante = 'primary',
  badge,
  cargando = false,
  onClick,
  className = '',
  destacado = false,
}) {
  // Configuración de estilos por variante usando tokens de marca y estados
  const estilosVariante = {
    primary: {
      iconoBg: 'bg-pink-100 text-pink-700',
      bordeHover: 'hover:border-pink-300',
    },
    success: {
      iconoBg: 'bg-emerald-100 text-emerald-700',
      bordeHover: 'hover:border-emerald-300',
    },
    warning: {
      iconoBg: 'bg-amber-100 text-amber-700',
      bordeHover: 'hover:border-amber-300',
    },
    info: {
      iconoBg: 'bg-sky-100 text-sky-700',
      bordeHover: 'hover:border-sky-300',
    },
    purple: {
      iconoBg: 'bg-purple-100 text-purple-700',
      bordeHover: 'hover:border-purple-300',
    },
    amber: {
      iconoBg: 'bg-orange-100 text-orange-700',
      bordeHover: 'hover:border-orange-300',
    },
  }

  const estilo = estilosVariante[variante] || estilosVariante.primary

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <div
      onClick={onClick}
      className={`min-w-0 rounded-2xl border p-5 transition-colors duration-200 ${destacado ? 'border-pink-200 bg-pink-50' : 'border-theme-border-subtle bg-theme-surface'} ${
        onClick ? `cursor-pointer ${estilo.bordeHover} hover:bg-theme-subtle` : ''
      } ${className}`}
    >
      {cargando ? (
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-theme-hover" />
            <div className="h-10 w-10 rounded-xl bg-theme-hover" />
          </div>
          <div className="h-7 w-20 rounded bg-theme-hover" />
          <div className="h-3 w-32 rounded bg-theme-hover" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-theme-muted">
                {titulo}
              </p>
              <p className={`mt-3 break-words font-semibold tracking-tight tabular-nums text-theme-heading ${destacado ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
                {valor}
              </p>
            </div>
            <div aria-hidden="true" className={`ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-2 ${estilo.iconoBg}`}>
              {icono}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-theme-border-subtle pt-3">
            {subtitulo && (
              <span className="text-xs text-theme-muted">
                {subtitulo}
              </span>
            )}
            {badge && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  badgeStyles[badge.tipo] || badgeStyles.neutral
                }`}
              >
                {badge.texto}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

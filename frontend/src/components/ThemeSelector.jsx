import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

// Iconos vectoriales limpios (SVG)
function IconoSol({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function IconoLuna({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  )
}

function IconoReloj({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ThemeSelector() {
  const {
    tema,
    modo,
    modoEfectivo,
    horaCliente,
    cambiarTema,
    cambiarModo,
    temasDisponibles,
    modosDisponibles,
  } = useTheme()

  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const manejarClickFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false)
      }
    }

    if (abierto) {
      document.addEventListener('mousedown', manejarClickFuera)
    }
    return () => {
      document.removeEventListener('mousedown', manejarClickFuera)
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return undefined
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setAbierto(false)
        contenedorRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', cerrarConEscape)
    return () => document.removeEventListener('keydown', cerrarConEscape)
  }, [abierto])

  const temaActual = temasDisponibles.find((t) => t.id === tema) || temasDisponibles[1]

  const obtenerIconoModo = (idModo, className = 'h-4 w-4') => {
    if (idModo === 'dia') return <IconoSol className={className} />
    if (idModo === 'noche') return <IconoLuna className={className} />
    return <IconoReloj className={className} />
  }

  return (
    <div className="relative inline-block text-left" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((anterior) => !anterior)}
        aria-expanded={abierto}
        aria-controls="selector-tema-panel"
        aria-label={`Personalizar apariencia. Tema ${temaActual.nombre}, modo ${modoEfectivo}`}
        title="Personalizar tema y modo"
        className="flex min-h-10 items-center gap-2 rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm font-medium text-theme-body transition-colors hover:bg-theme-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-theme-border"
          style={{ backgroundColor: temaActual.colorMuestra }}
        />
        <span className="hidden sm:inline">{temaActual.nombre}</span>
        <span aria-hidden="true" className="text-theme-soft">·</span>
        <span aria-hidden="true" className="text-theme-body">
          {obtenerIconoModo(modoEfectivo, 'h-3.5 w-3.5')}
        </span>
        <span className="hidden text-xs tabular-nums text-theme-muted md:inline">
          {horaCliente}
        </span>
        <svg
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-theme-muted transform transition-transform duration-200 ${
            abierto ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menú Desplegable Flotante */}
      {abierto && (
        <div id="selector-tema-panel" className="fixed inset-x-4 top-24 z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-theme-border-subtle bg-theme-surface p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-88 sm:max-h-[calc(100dvh-6rem)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-theme-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-theme-heading">
                Apariencia
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs tabular-nums text-theme-muted">
              <IconoReloj className="h-3 w-3" />
              <span>{horaCliente}</span>
            </div>
          </div>

          {/* Sección 1: Selector de Temas */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-theme-heading">Tema visual</p>
            <div className="grid grid-cols-1 gap-2">
              {temasDisponibles.map((t) => {
                const activo = tema === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => cambiarTema(t.id)}
                    className={`flex min-h-12 w-full items-center justify-between rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                      activo
                        ? 'border-pink-600 bg-pink-50 text-theme-heading'
                        : 'border-theme-border-subtle bg-theme-surface text-theme-body hover:bg-theme-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full border border-theme-border"
                        style={{ backgroundColor: t.colorMuestra }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-theme-heading">
                          {t.nombre}
                          {t.id === 'ninos' && tema === 'ninos' && (
                            <span aria-hidden="true" className="ml-1.5 text-xs">🧸</span>
                          )}
                        </p>
                        <p className="text-xs text-theme-muted">
                          {t.descripcion}
                        </p>
                      </div>
                    </div>
                    {activo && (
                      <svg
                        className="h-4 w-4 text-pink-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sección 2: Selector de Modo (Día / Noche / Auto) */}
          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium text-theme-heading">Modo de visualización</p>
            <div className="grid grid-cols-3 gap-2">
              {modosDisponibles.map((m) => {
                const activo = modo === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => cambiarModo(m.id)}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
                      activo
                        ? 'border-pink-600 bg-pink-50 text-theme-heading font-semibold'
                        : 'border-theme-border-subtle bg-theme-surface text-theme-body hover:bg-theme-hover'
                    }`}
                  >
                    <span aria-hidden="true" className={activo ? 'text-pink-700' : 'text-theme-muted'}>
                      {obtenerIconoModo(m.id, 'h-5 w-5')}
                    </span>
                    <span className="mt-1 text-xs">{m.nombre}</span>
                  </button>
                )
              })}
            </div>

            {/* Banner de información horaria */}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-theme-subtle p-3 text-xs text-theme-body">
              <span aria-hidden="true" className="shrink-0">
                {obtenerIconoModo(modoEfectivo, 'h-4 w-4')}
              </span>
              <span>
                {modo === 'auto' ? (
                  <>
                    Horario local:{' '}
                    <strong>{horaCliente}</strong> → Activo:{' '}
                    <strong>{modoEfectivo === 'dia' ? 'Modo Día' : 'Modo Noche'}</strong>
                  </>
                ) : (
                  <>
                    Modo fijado manualmente en:{' '}
                    <strong>{modo === 'dia' ? 'Día' : 'Noche'}</strong>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeSelector

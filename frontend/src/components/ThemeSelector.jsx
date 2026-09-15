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

function IconoPaleta({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21a4 4 0 01-4-4 5 5 0 014-4h4a4 4 0 014 4v1a3 3 0 01-3 3H7zm0 0h10a2 2 0 002-2v-4a7 7 0 00-7-7H9a7 7 0 00-7 7v4a2 2 0 002 2h3"
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

  const temaActual = temasDisponibles.find((t) => t.id === tema) || temasDisponibles[1]

  const obtenerIconoModo = (idModo, className = 'h-4 w-4') => {
    if (idModo === 'dia') return <IconoSol className={className} />
    if (idModo === 'noche') return <IconoLuna className={className} />
    return <IconoReloj className={className} />
  }

  return (
    <div className="relative inline-block text-left" ref={contenedorRef}>
      {/* Botón trigger principal sin emojis */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        title="Personalizar tema y modo"
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
      >
        <span
          className="h-3 w-3 rounded-full border border-slate-300 shadow-inner"
          style={{ backgroundColor: temaActual.colorMuestra }}
        />
        <span className="hidden sm:inline">{temaActual.nombre}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-600">
          {obtenerIconoModo(modoEfectivo, 'h-3.5 w-3.5')}
        </span>
        <span className="hidden md:inline text-slate-500 font-mono text-[11px]">
          {horaCliente}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transform transition-transform duration-200 ${
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Personalizar Tema y Modo
              </h3>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-600">
              <IconoReloj className="h-3 w-3" />
              <span>{horaCliente}</span>
            </div>
          </div>

          {/* Sección 1: Selector de Temas */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tema Visual
            </label>
            <div className="grid grid-cols-1 gap-2">
              {temasDisponibles.map((t) => {
                const activo = tema === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => cambiarTema(t.id)}
                    className={`flex items-center justify-between rounded-xl p-2.5 text-left border transition ${
                      activo
                        ? 'border-pink-600 bg-pink-50 text-pink-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full border border-slate-300 shadow-inner shrink-0"
                        style={{ backgroundColor: t.colorMuestra }}
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {t.nombre}
                          {t.id === 'ninos' && tema === 'ninos' && (
                            <span className="ml-1.5 text-xs">🧸</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Modo de Visualización
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modosDisponibles.map((m) => {
                const activo = modo === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => cambiarModo(m.id)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center border transition ${
                      activo
                        ? 'border-pink-600 bg-pink-50 text-pink-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={activo ? 'text-pink-600' : 'text-slate-500'}>
                      {obtenerIconoModo(m.id, 'h-5 w-5')}
                    </span>
                    <span className="mt-1 text-xs">{m.nombre}</span>
                  </button>
                )
              })}
            </div>

            {/* Banner de información horaria */}
            <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100 flex items-center gap-2">
              <span className="text-slate-600 shrink-0">
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

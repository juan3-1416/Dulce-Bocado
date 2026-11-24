import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { registrarVisita } from '../services/visitaService'

function Footer() {
  const location = useLocation()
  const [cantidadVisitas, setCantidadVisitas] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let activo = true

    const ejecutarRegistro = async () => {
      setCargando(true)
      setCantidadVisitas(null)
      try {
        const rutaActual = location.pathname || '/'
        const respuesta = await registrarVisita(rutaActual)
        if (activo && respuesta?.visita) {
          setCantidadVisitas(respuesta.visita.cantidad)
        }
      } catch {
        if (activo) setCantidadVisitas(null)
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    ejecutarRegistro()

    return () => {
      activo = false
    }
  }, [location.pathname])

  return (
    <footer className="mt-auto border-t border-theme-border-subtle bg-theme-surface py-4 text-xs text-theme-muted">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-theme-heading">Dulce Bocado</span>
          <span aria-hidden="true" className="text-theme-soft">·</span>
          <span>Sistema de Gestión Pastelería</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 text-theme-muted" aria-live="polite">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>
              Visitas a esta página: {' '}
              {cargando ? (
                <span>Cargando…</span>
              ) : cantidadVisitas === null ? (
                <span>No disponible</span>
              ) : (
                <strong className="font-semibold tabular-nums text-theme-heading">
                  {cantidadVisitas.toLocaleString()}
                </strong>
              )}
            </span>
          </div>

        </div>
      </div>
    </footer>
  )
}

export default Footer

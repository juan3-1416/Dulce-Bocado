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
      } catch (error) {
        console.error('Error al registrar visita de página:', error)
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
    <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-slate-600 text-xs shadow-sm">
      <div className="mx-auto flex flex-col items-center justify-between gap-2 sm:flex-row max-w-7xl">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-pink-600">Dulce Bocado</span>
          <span className="text-slate-300">|</span>
          <span>Sistema de Gestión Pastelería</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700 font-medium">
            <svg
              className="h-3.5 w-3.5 text-pink-500"
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
              {cargando || cantidadVisitas === null ? (
                <span className="animate-pulse text-slate-400">cargando...</span>
              ) : (
                <strong className="text-slate-900 font-bold">
                  {cantidadVisitas.toLocaleString()}
                </strong>
              )}
            </span>
          </div>

          <span className="hidden sm:inline text-slate-400 font-mono">
            [{location.pathname}]
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

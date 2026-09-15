import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_THEME_KEY = 'dulce_bocado_theme'
const STORAGE_MODE_KEY = 'dulce_bocado_mode'

export const TEMAS_DISPONIBLES = [
  {
    id: 'ninos',
    nombre: 'Niños',
    descripcion: 'Paleta lúdica, fresca y amigable',
    colorMuestra: '#0284c7',
  },
  {
    id: 'jovenes',
    nombre: 'Jóvenes',
    descripcion: 'Diseño dinámico, moderno y fresco',
    colorMuestra: '#e11d48',
  },
  {
    id: 'adultos',
    nombre: 'Adultos',
    descripcion: 'Estilo elegante, sobrio y gourmet',
    colorMuestra: '#7c4d2d',
  },
]

export const MODOS_DISPONIBLES = [
  {
    id: 'dia',
    nombre: 'Día',
    descripcion: 'Luminoso y claro',
  },
  {
    id: 'noche',
    nombre: 'Noche',
    descripcion: 'Oscuro y confortable',
  },
  {
    id: 'auto',
    nombre: 'Automático',
    descripcion: 'Según horario del cliente (Día: 7h-19h / Noche: 19h-7h)',
  },
]

/**
 * Determina si según la hora local del cliente corresponde día o noche.
 * Día: de 07:00 a 18:59:59
 * Noche: de 19:00 a 06:59:59
 */
function calcularModoHorario() {
  const ahora = new Date()
  const horas = ahora.getHours()
  return horas >= 7 && horas < 19 ? 'dia' : 'noche'
}

function formatearHoraCliente() {
  const ahora = new Date()
  return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ThemeProvider({ children }) {
  // Tema inicial: desde localStorage o 'jovenes' por defecto
  const [tema, setTema] = useState(() => {
    const guardado = localStorage.getItem(STORAGE_THEME_KEY)
    if (guardado && ['ninos', 'jovenes', 'adultos'].includes(guardado)) {
      return guardado
    }
    return 'jovenes'
  })

  // Modo inicial: desde localStorage o 'auto' por defecto
  const [modo, setModo] = useState(() => {
    const guardado = localStorage.getItem(STORAGE_MODE_KEY)
    if (guardado && ['dia', 'noche', 'auto'].includes(guardado)) {
      return guardado
    }
    return 'auto'
  })

  const [horaCliente, setHoraCliente] = useState(formatearHoraCliente)
  const [modoHorario, setModoHorario] = useState(calcularModoHorario)

  // Intervalo para actualizar reloj y modo horario en tiempo real
  useEffect(() => {
    const actualizar = () => {
      setHoraCliente(formatearHoraCliente())
      setModoHorario(calcularModoHorario())
    }

    const timer = setInterval(actualizar, 30000)
    return () => clearInterval(timer)
  }, [])

  // El modo efectivo es el manual si es 'dia'/'noche', o el calculado por horario si es 'auto'
  const modoEfectivo = modo === 'auto' ? modoHorario : modo

  // Aplicar atributos en el elemento raíz del DOM
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', tema)
    root.setAttribute('data-mode', modoEfectivo)

    if (modoEfectivo === 'noche') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [tema, modoEfectivo])

  const cambiarTema = (nuevoTema) => {
    if (['ninos', 'jovenes', 'adultos'].includes(nuevoTema)) {
      setTema(nuevoTema)
      localStorage.setItem(STORAGE_THEME_KEY, nuevoTema)
    }
  }

  const cambiarModo = (nuevoModo) => {
    if (['dia', 'noche', 'auto'].includes(nuevoModo)) {
      setModo(nuevoModo)
      localStorage.setItem(STORAGE_MODE_KEY, nuevoModo)
    }
  }

  const valor = useMemo(
    () => ({
      tema,
      modo,
      modoEfectivo,
      horaCliente,
      cambiarTema,
      cambiarModo,
      temasDisponibles: TEMAS_DISPONIBLES,
      modosDisponibles: MODOS_DISPONIBLES,
    }),
    [tema, modo, modoEfectivo, horaCliente],
  )

  return (
    <ThemeContext.Provider value={valor}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const contexto = useContext(ThemeContext)
  if (!contexto) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider.')
  }
  return contexto
}

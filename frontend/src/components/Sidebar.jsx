import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// Componentes de iconos vectoriales SVG limpios
function IconoInicio({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function IconoSeguridad({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function IconoCatalogo({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function IconoProduccion({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconoInventario({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function IconoVentas({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function IconoClientes({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconoCompras({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconoReportes({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

/**
 * Configuración modular de los módulos y opciones de navegación.
 * Estructurado según los 27 Casos de Uso (CU) oficiales del sistema.
 */
const SECCIONES_MENU = [
{
  id: 'seguridad',
  titulo: 'Seguridad',
  iconoComponente: IconoSeguridad,
  iconoNinos: '🛡️',
  opciones: [
    {
      nombre: 'Usuarios',
      ruta: '/seguridad/usuarios',
      permiso: 'seguridad.gestionar_usuario',
    },
    {
      nombre: 'Asignaciones',
      ruta: '/seguridad/asignaciones',
      permiso: 'seguridad.asignar_roles_permisos',
    },
    {
      nombre: 'Rol - Permiso',
      ruta: '/seguridad/rol-permiso',
      permiso: 'seguridad.gestionar_rol_permiso',
    },
  ],
},
  {
    id: 'catalogo',
    titulo: 'Catálogo y Recetas',
    iconoComponente: IconoCatalogo,
    iconoNinos: '🧁',
    opciones: [
      {
        nombre: 'Productos y Presentaciones',
        ruta: '/productos',
        permiso: 'productos.gestionar_producto',
      },
      {
        nombre: 'Recetas',
        ruta: '/recetas',
        permiso: 'recetas.gestionar_receta',
      },
      {
        nombre: 'Materias Primas',
        ruta: '/recetas/materias-primas',
        permiso: 'recetas.gestionar_receta',
      },
    ],
  },
  {
    id: 'produccion',
    titulo: 'Producción',
    iconoComponente: IconoProduccion,
    iconoNinos: '⚙️',
    opciones: [
      {
        nombre: 'Producción',
        ruta: '/produccion',
        permiso: 'produccion.listar',
      },

    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventario',
    iconoComponente: IconoInventario,
    iconoNinos: '📦',
    opciones: [
      {
        nombre: 'Almacenes y Stock',
        ruta: '/almacenes',
        permiso: 'inventario.listar_almacenes',
      },
      {
        nombre: 'Ingresos',
        ruta: '/inventario/ingresos',
        permiso: 'inventario.gestionar_ingreso',
      },
      {
        nombre: 'Egresos',
        ruta: '/inventario/egresos',
        permiso: 'inventario.gestionar_egreso',
      },
    ],
  },
  {
    id: 'ventas',
    titulo: 'Ventas y Comercial',
    iconoComponente: IconoVentas,
    iconoNinos: '💳',
    opciones: [
      {
        nombre: 'Ventas',
        ruta: '/ventas',
        permiso: 'ventas.gestionar_venta',
      },

      {
        nombre: 'Pagos por Internet',
        ruta: '/pagos-internet',
        permiso: 'pagos.gestionar_pago_internet',
      },

      {
        nombre: 'Gestión de Pedidos',
        ruta: '/pedidos',
        permiso: 'pedidos.gestionar_pedido',
      },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    iconoComponente: IconoClientes,
    iconoNinos: '👥',
    opciones: [
      {
        nombre: 'Directorio de Clientes',
        ruta: '/clientes',
        permiso: 'clientes.gestionar_cliente',
      },
    ],
  },
  {
    id: 'compras',
    titulo: 'Compras',
    iconoComponente: IconoCompras,
    iconoNinos: '🛒',
    opciones: [
      {
        nombre: 'Proveedores y Compras',
        ruta: '/compras',
        permiso: 'compras.gestionar_compras',
      },
    ],
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    iconoComponente: IconoReportes,
    iconoNinos: '📊',
    opciones: [
      {
        nombre: 'Dashboard',
        ruta: '/dashboard',
        permiso: 'dashboard.consultar',
      },
      {
        nombre: 'Reportes Generales',
        ruta: '/reportes',
        permiso: 'reportes.generar',
      },
    ],
  },
]

function Sidebar() {
  const { tienePermiso } = useAuth()
  const { tema } = useTheme()
  const location = useLocation()

  const esTemaNinos = tema === 'ninos'

  // Estado del buscador interactivo
  const [busqueda, setBusqueda] = useState('')

  // Control de apertura/cierre de cada sección por su ID
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(() => {
    const inicial = { seguridad: true }
    SECCIONES_MENU.forEach((seccion) => {
      const coincideRuta = seccion.opciones.some((opcion) =>
        location.pathname.startsWith(opcion.ruta),
      )
      if (coincideRuta) {
        inicial[seccion.id] = true
      }
    })
    return inicial
  })

  const toggleSeccion = (id) => {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Filtrado reactivo de módulos según permisos RBAC y texto de búsqueda
  const seccionesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return SECCIONES_MENU.map((seccion) => {
      const opcionesAutorizadas = seccion.opciones.filter((opcion) =>
        tienePermiso(opcion.permiso),
      )

      if (opcionesAutorizadas.length === 0) {
        return null
      }

      if (!termino) {
        return {
          ...seccion,
          opciones: opcionesAutorizadas,
        }
      }

      const coincideTitulo = seccion.titulo.toLowerCase().includes(termino)
      const opcionesCoincidentes = opcionesAutorizadas.filter((op) =>
        op.nombre.toLowerCase().includes(termino),
      )

      if (coincideTitulo || opcionesCoincidentes.length > 0) {
        return {
          ...seccion,
          opciones: coincideTitulo ? opcionesAutorizadas : opcionesCoincidentes,
        }
      }

      return null
    }).filter(Boolean)
  }, [busqueda, tienePermiso])

  const totalOpcionesVisibles = useMemo(() => {
    return seccionesFiltradas.reduce((acc, sec) => acc + sec.opciones.length, 0)
  }, [seccionesFiltradas])

  const alternarTodo = () => {
    const todasAbiertas = seccionesFiltradas.every(
      (sec) => seccionesAbiertas[sec.id],
    )
    const nuevoEstado = {}
    seccionesFiltradas.forEach((sec) => {
      nuevoEstado[sec.id] = !todasAbiertas
    })
    setSeccionesAbiertas((prev) => ({ ...prev, ...nuevoEstado }))
  }

  const claseEnlace = ({ isActive }) =>
    [
      'block rounded-lg px-3.5 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-pink-100 text-pink-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

  return (
    <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
      {/* Cabecera del Menú Interactivo */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Navegación
          </span>
          <button
            type="button"
            onClick={alternarTodo}
            className="text-[11px] font-medium text-pink-600 hover:text-pink-700 hover:underline"
            title="Expandir o colapsar todas las secciones"
          >
            {seccionesFiltradas.every((sec) => seccionesAbiertas[sec.id])
              ? 'Colapsar todo'
              : 'Expandir todo'}
          </button>
        </div>

        {/* Buscador de Opciones en Tiempo Real */}
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar módulo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-pink-500 focus:bg-white focus:ring-1 focus:ring-pink-500 transition"
          />
          <svg
            className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {busqueda && (
          <p className="px-1 text-[11px] text-slate-500">
            {totalOpcionesVisibles}{' '}
            {totalOpcionesVisibles === 1 ? 'resultado' : 'resultados'} encontrados
          </p>
        )}
      </div>

      <nav className="space-y-1.5">
        {/* Enlace estático Inicio */}
        <NavLink to="/" end className={claseEnlace}>
          <span className="flex items-center gap-2.5">
            {esTemaNinos ? (
              <span className="text-sm">🏠</span>
            ) : (
              <IconoInicio className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span>Inicio</span>
          </span>
        </NavLink>

        {/* Secciones dinámicas */}
        {seccionesFiltradas.map((seccion) => {
          const estaAbierta = busqueda
            ? true
            : Boolean(seccionesAbiertas[seccion.id])

          const IconoSec = seccion.iconoComponente

          return (
            <div key={seccion.id} className="pt-1.5">
              <button
                type="button"
                onClick={() => toggleSeccion(seccion.id)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                title={`Alternar módulo ${seccion.titulo}`}
              >
                <span className="flex items-center gap-2">
                  {esTemaNinos ? (
                    <span className="text-sm">{seccion.iconoNinos}</span>
                  ) : (
                    <IconoSec className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span>{seccion.titulo}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                    {seccion.opciones.length}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 transform transition-transform duration-200 ${
                      estaAbierta ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {estaAbierta && (
                <div className="mt-1 space-y-1 pl-2">
                  {seccion.opciones.map((opcion) => (
                    <NavLink
                      key={opcion.ruta}
                      to={opcion.ruta}
                      className={claseEnlace}
                    >
                      {opcion.nombre}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {seccionesFiltradas.length === 0 && (
          <div className="p-3 text-center text-xs text-slate-500">
            No se encontraron módulos para "{busqueda}".
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar

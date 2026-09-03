import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Configuración modular de los módulos y opciones de navegación.
 * Estructurado según los 27 Casos de Uso (CU) oficiales del sistema.
 * Cada opción define su ruta y el permiso requerido para visualizarse.
 */
const SECCIONES_MENU = [
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    opciones: [
      {
        nombre: 'Usuarios',
        ruta: '/seguridad/usuarios',
        permiso: 'seguridad.gestionar_usuario',
      },
      {
        nombre: 'Roles',
        ruta: '/seguridad/roles',
        permiso: 'seguridad.gestionar_rol',
      },
      {
        nombre: 'Permisos',
        ruta: '/seguridad/permisos',
        permiso: 'seguridad.gestionar_permiso',
      },
      {
        nombre: 'Rol - Permiso',
        ruta: '/seguridad/rol-permiso',
        permiso: 'seguridad.gestionar_rol_permiso',
      },
      {
        nombre: 'Asignaciones',
        ruta: '/seguridad/asignaciones',
        permiso: 'seguridad.asignar_roles_permisos',
      },
    ],
  },
  {
    id: 'catalogo',
    titulo: 'Catálogo y Recetas',
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
    ],
  },
  {
    id: 'produccion',
    titulo: 'Producción',
    opciones: [
      {
        nombre: 'Producción',
        ruta: '/produccion',
        permiso: 'produccion.gestionar_produccion',
      },
      {
        nombre: 'Consumo y Desperdicio',
        ruta: '/produccion/consumo-desperdicio',
        permiso: 'produccion.registrar_consumo',
      },
    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventario',
    opciones: [
      {
        nombre: 'Almacenes y Stock',
        ruta: '/inventario/almacenes',
        permiso: 'inventario.gestionar_almacenes',
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
      {
        nombre: 'Ajustes',
        ruta: '/inventario/ajustes',
        permiso: 'inventario.gestionar_ajuste',
      },
    ],
  },
  {
    id: 'ventas',
    titulo: 'Ventas y Comercial',
    opciones: [
      {
        nombre: 'Ventas',
        ruta: '/ventas',
        permiso: 'ventas.gestionar_venta',
      },
      {
        nombre: 'Pagos',
        ruta: '/pagos',
        permiso: 'pagos.gestionar_pago',
      },
      {
        nombre: 'Recibos',
        ruta: '/recibos',
        permiso: 'recibos.gestionar_recibo',
      },
      {
        nombre: 'Caja y Turnos',
        ruta: '/caja',
        permiso: 'caja.gestionar_caja',
      },
    ],
  },
  {
    id: 'pedidos',
    titulo: 'Pedidos',
    opciones: [
      {
        nombre: 'Gestión de Pedidos',
        ruta: '/pedidos',
        permiso: 'pedidos.gestionar_pedido',
      },
      {
        nombre: 'Estado y Entrega',
        ruta: '/pedidos/entregas',
        permiso: 'pedidos.gestionar_entrega',
      },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    opciones: [
      {
        nombre: 'Clientes',
        ruta: '/clientes',
        permiso: 'clientes.gestionar_cliente',
      },
    ],
  },
  {
    id: 'compras',
    titulo: 'Compras',
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
  const location = useLocation()

  // Control de apertura/cierre de cada sección por su ID
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(() => {
    // Por defecto abrimos la sección activa según la ruta actual o 'seguridad'
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

  const claseEnlace = ({ isActive }) =>
    [
      'block rounded-lg px-4 py-2.5 text-sm font-medium transition',
      isActive
        ? 'bg-pink-100 text-pink-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

  return (
    <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
      <nav className="space-y-2">
        {/* Enlace estático principal */}
        <NavLink
          to="/"
          end
          className={claseEnlace}
        >
          Inicio
        </NavLink>

        {/* Secciones modulares filtradas por permisos RBAC */}
        {SECCIONES_MENU.map((seccion) => {
          const opcionesVisibles = seccion.opciones.filter((opcion) =>
            tienePermiso(opcion.permiso),
          )

          // Si el usuario no tiene permisos para ninguna opción del módulo, no se muestra la sección
          if (opcionesVisibles.length === 0) {
            return null
          }

          const estaAbierta = Boolean(seccionesAbiertas[seccion.id])

          return (
            <div key={seccion.id} className="pt-2">
              <button
                type="button"
                onClick={() => toggleSeccion(seccion.id)}
                className="flex w-full items-center justify-between px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition"
                title={`Alternar módulo ${seccion.titulo}`}
              >
                <span>{seccion.titulo}</span>
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
              </button>

              {estaAbierta && (
                <div className="mt-1 space-y-1">
                  {opcionesVisibles.map((opcion) => (
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
      </nav>
    </aside>
  )
}

export default Sidebar

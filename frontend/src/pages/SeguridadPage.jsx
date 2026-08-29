import { useLocation } from 'react-router-dom'

const informacion = {
  '/seguridad/usuarios': {
    titulo: 'Gestión de Usuarios',
    casoUso: 'CU2',
  },

  '/seguridad/roles': {
    titulo: 'Gestión de Roles',
    casoUso: 'CU3',
  },

  '/seguridad/permisos': {
    titulo: 'Gestión de Permisos',
    casoUso: 'CU4',
  },

  '/seguridad/rol-permiso': {
    titulo: 'Gestión Rol-Permiso',
    casoUso: 'CU5',
  },

  '/seguridad/asignaciones': {
    titulo: 'Asignación de Roles y Permisos',
    casoUso: 'CU6',
  },
}

function SeguridadPage() {
  const location = useLocation()

  const datos = informacion[location.pathname]

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <span className="text-sm font-semibold text-pink-600">
        {datos?.casoUso}
      </span>

      <h1 className="mt-2 text-3xl font-bold text-slate-800">
        {datos?.titulo || 'Seguridad'}
      </h1>

      <div className="mt-6 rounded-xl bg-blue-50 p-5 text-blue-700">
        Ruta protegida correctamente.
        La funcionalidad será implementada en el siguiente bloque.
      </div>
    </div>
  )
}

export default SeguridadPage
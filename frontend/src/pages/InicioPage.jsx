import { useAuth } from '../context/AuthContext'

function InicioPage() {
  const { usuario } = useAuth()

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <span className="text-sm font-semibold text-pink-600">
        Dulce Bocado
      </span>

      <h1 className="mt-2 text-3xl font-bold text-slate-800">
        Bienvenido, {usuario.nombre}
      </h1>

      <p className="mt-3 text-slate-600">
        La autenticación y el control de acceso están funcionando.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">
            Usuario
          </p>

          <p className="mt-1 font-semibold text-slate-800">
            {usuario.nombre_usuario}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">
            Rol
          </p>

          <p className="mt-1 font-semibold text-slate-800">
            {usuario.roles.join(', ')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InicioPage
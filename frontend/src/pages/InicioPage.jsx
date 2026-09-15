import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function InicioPage() {
  const { usuario, tienePermiso } = useAuth()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Dulce Bocado
        </span>

        <h1 className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">
          Bienvenido, {usuario?.nombre}
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Panel de control y sistema de gestión de pastelería Dulce Bocado.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Usuario
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">
              {usuario?.nombre_usuario}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rol Asignado
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">
              {usuario?.roles?.join(', ')}
            </p>
          </div>
        </div>

        {/* Acceso Rápido al Dashboard para Administradores / Usuarios autorizados */}
        {tienePermiso('dashboard.consultar') && (
          <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50/60 p-6 transition-all hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-2xl text-white shadow-sm shadow-rose-600/30">
                  📊
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Dashboard Administrativo (CU24)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                    Visualiza KPIs globales, gráficos de ventas, estado de pedidos y existencias críticas en tiempo real.
                  </p>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:bg-rose-700 active:scale-95 dark:bg-rose-500 dark:hover:bg-rose-600 shrink-0"
              >
                <span>Abrir Dashboard</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InicioPage
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function InicioPage() {
  const { usuario, tienePermiso } = useAuth()
  const nombre = usuario?.nombre?.trim() || usuario?.nombre_usuario?.trim() || 'usuario'
  const roles = usuario?.roles?.length ? usuario.roles.join(', ') : 'Sin rol asignado'

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-12 text-theme-body">
      <section className="rounded-2xl border border-theme-border-subtle bg-theme-surface p-6 sm:p-8">
        <h1 className="break-words text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">
          Bienvenido, {nombre}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-muted sm:text-base">
          Panel de control y sistema de gestión de pastelería Dulce Bocado.
        </p>

        <dl className="mt-7 grid gap-5 border-t border-theme-border-subtle pt-6 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-theme-muted">Usuario</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-theme-heading">
              {usuario?.nombre_usuario || 'No disponible'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-theme-muted">Rol asignado</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-theme-heading">{roles}</dd>
          </div>
        </dl>
      </section>

      {tienePermiso('dashboard.consultar') ? (
        <section className="flex flex-col gap-5 rounded-2xl border border-pink-200 bg-pink-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 3v18h18M7 15l4-4 3 2 5-6" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-theme-heading">Resumen del negocio</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-theme-body">
                Consulta ventas, pedidos e inventario del período que elijas.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-theme-brand-text transition-colors hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-600 sm:self-auto"
          >
            Abrir dashboard
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
        </section>
      ) : (
        <p className="px-1 text-sm text-theme-muted">Selecciona una sección del menú para comenzar.</p>
      )}
    </main>
  )
}

export default InicioPage

function InicioPage({ usuario, onLogout, cerrandoSesion }) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-semibold text-pink-600">
              Dulce Bocado
            </span>

            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              Bienvenido, {usuario.nombre}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Usuario: {usuario.nombre_usuario}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={cerrandoSesion}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cerrandoSesion
              ? 'Cerrando sesión...'
              : 'Cerrar sesión'}
          </button>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">
              Datos del usuario
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">
                  Nombre
                </dt>
                <dd className="text-slate-800">
                  {usuario.nombre}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-slate-500">
                  Correo electrónico
                </dt>
                <dd className="text-slate-800">
                  {usuario.correo_electronico}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">
              Roles
            </h2>

            <div className="mt-5 flex flex-wrap gap-2">
              {usuario.roles.map((rol) => (
                <span
                  key={rol}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  {rol}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            Permisos actuales
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {usuario.permisos.map((permiso) => (
              <div
                key={permiso}
                className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {permiso}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default InicioPage
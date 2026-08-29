import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-500">
          404
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-800">
          Página no encontrada
        </h1>

        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-pink-600 px-5 py-3 font-medium text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}

export default NotFoundPage
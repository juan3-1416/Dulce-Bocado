import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

function AccesoDenegadoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-red-600">
            403
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-800">
            Acceso denegado
          </h1>

          <p className="mt-3 text-slate-600">
            No tienes permiso para acceder a esta funcionalidad.
          </p>

          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-pink-600 px-5 py-3 font-medium text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AccesoDenegadoPage
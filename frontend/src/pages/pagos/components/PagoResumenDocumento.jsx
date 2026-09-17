function PagoResumenDocumento({ tipoCobro, documentoSeleccionado }) {
  if (!documentoSeleccionado) {
    return null
  }

  const idDoc = tipoCobro === 'venta' ? documentoSeleccionado.id_venta : documentoSeleccionado.id_pedido
  const etiqueta = tipoCobro === 'venta' ? 'Venta' : 'Pedido'

  return (
    <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
      <div>
        <p className="text-xs font-medium uppercase text-gray-500">{etiqueta}</p>
        <p className="mt-1 font-bold text-gray-900">#{idDoc}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Total</p>
        <p className="mt-1 font-bold text-gray-900">
          Bs {Number(documentoSeleccionado.total).toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Pagado</p>
        <p className="mt-1 font-bold text-gray-900">
          Bs {Number(documentoSeleccionado.total_pagado).toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Saldo</p>
        <p className="mt-1 font-bold text-pink-600">
          Bs {Number(documentoSeleccionado.saldo).toFixed(2)}
        </p>
      </div>
    </div>
  )
}

export default PagoResumenDocumento

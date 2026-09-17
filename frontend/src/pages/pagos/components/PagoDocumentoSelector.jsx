function PagoDocumentoSelector({
  tipoCobro,
  setTipoCobro,
  idVenta,
  idPedido,
  ventas = [],
  pedidos = [],
  manejarCambioVenta,
  manejarCambioPedido,
  obtenerNombreCliente,
}) {
  return (
    <div className="space-y-4">
      {ventas.length > 0 && pedidos.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Aplicar cobro a:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="venta"
                checked={tipoCobro === 'venta'}
                onChange={(e) => setTipoCobro(e.target.value)}
                className="text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-800">Venta</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="pedido"
                checked={tipoCobro === 'pedido'}
                onChange={(e) => setTipoCobro(e.target.value)}
                className="text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-800">Pedido</span>
            </label>
          </div>
        </div>
      )}

      {tipoCobro === 'venta' && (
        <div>
          <label
            htmlFor="venta_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Venta
          </label>
          <select
            id="venta_pago"
            value={idVenta}
            onChange={manejarCambioVenta}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <option value="">Seleccionar venta</option>
            {ventas.map((venta) => (
              <option key={venta.id_venta} value={venta.id_venta}>
                Venta #{venta.id_venta} — {obtenerNombreCliente(venta)} — Saldo Bs {Number(venta.saldo).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      )}

      {tipoCobro === 'pedido' && (
        <div>
          <label
            htmlFor="pedido_pago"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Pedido
          </label>
          <select
            id="pedido_pago"
            value={idPedido}
            onChange={manejarCambioPedido}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <option value="">Seleccionar pedido</option>
            {pedidos.map((pedido) => (
              <option key={pedido.id_pedido} value={pedido.id_pedido}>
                Pedido #{pedido.id_pedido} — {obtenerNombreCliente(pedido)} — Saldo Bs {Number(pedido.saldo).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export default PagoDocumentoSelector

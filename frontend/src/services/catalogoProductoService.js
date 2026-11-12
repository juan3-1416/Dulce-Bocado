import { solicitarCatalogo } from './catalogoService'

export const listarProductos = (filtros = {}) => solicitarCatalogo('productos', {
  filtros: {
    ...filtros,
    estado: filtros.estado === 'true' ? '1' : filtros.estado === 'false' ? '0' : filtros.estado,
  },
})

export const crearProducto = (datos) => solicitarCatalogo('productos', {
  method: 'POST', datos,
})

export const actualizarProducto = (id, datos) => solicitarCatalogo(`productos/${id}`, {
  method: 'PUT', datos,
})

import { solicitarCatalogo } from './catalogoService'

export const listarPresentaciones = (filtros = {}) => solicitarCatalogo('presentaciones', {
  filtros: {
    id_producto: filtros.id_producto,
    disponible: filtros.disponible,
  },
})

export const crearPresentacion = (datos) => solicitarCatalogo('presentaciones', {
  method: 'POST', datos,
})

export const actualizarPresentacion = (id, datos) => solicitarCatalogo(`presentaciones/${id}`, {
  method: 'PUT', datos,
})

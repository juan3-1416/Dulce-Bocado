import { solicitarCatalogo } from './catalogoService'

export const listarCategorias = ({ solo_activas } = {}) => solicitarCatalogo('categorias', {
  filtros: solo_activas ? { solo_activas: 1 } : {},
})

export const crearCategoria = (datos) => solicitarCatalogo('categorias', {
  method: 'POST', datos,
})

export const actualizarCategoria = (id, datos) => solicitarCatalogo(`categorias/${id}`, {
  method: 'PUT', datos,
})

import { solicitarCatalogo } from './catalogoService'

export const listarMateriasPrimas = (filtros = {}) => solicitarCatalogo('materias-primas', { filtros })

export const crearMateriaPrima = (datos) => solicitarCatalogo('materias-primas', {
  method: 'POST', datos,
})

export const actualizarMateriaPrima = (id, datos) => solicitarCatalogo(`materias-primas/${id}`, {
  method: 'PUT', datos,
})

export const cambiarEstadoMateriaPrima = (id, estado) => solicitarCatalogo(`materias-primas/${id}/estado`, {
  method: 'PATCH', datos: { estado },
})

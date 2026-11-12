import { solicitarCatalogo } from './catalogoService'

function paraVista(receta) {
  if (!receta) return receta
  return {
    ...receta,
    id_producto_presentacion: receta.presentacion_id,
    producto_presentacion: {
      producto: receta.presentacion?.producto,
      presentacion: receta.presentacion,
    },
  }
}

export async function listarRecetas(filtros = {}) {
  const respuesta = await solicitarCatalogo('recetas', { filtros })
  return { ...respuesta, recetas: (respuesta.recetas ?? []).map(paraVista) }
}

export async function obtenerReceta(id) {
  const respuesta = await solicitarCatalogo(`recetas/${id}`)
  return { ...respuesta, receta: paraVista(respuesta.receta) }
}

export function crearReceta(datos) {
  const { id_producto_presentacion, ...resto } = datos
  return solicitarCatalogo('recetas', {
    method: 'POST',
    datos: { ...resto, presentacion_id: id_producto_presentacion },
  })
}

export function actualizarReceta(id, datos) {
  return solicitarCatalogo(`recetas/${id}`, { method: 'PUT', datos })
}

export function cambiarEstadoReceta(id, estado) {
  return solicitarCatalogo(`recetas/${id}/estado`, {
    method: 'PATCH', datos: { estado },
  })
}

export async function obtenerCatalogosReceta() {
  const [presentaciones, materias] = await Promise.all([
    solicitarCatalogo('presentaciones'),
    solicitarCatalogo('materias-primas', { filtros: { estado: '1' } }),
  ])
  return {
    productos_presentaciones: (presentaciones.presentaciones ?? []).map((item) => ({
      id_producto_presentacion: item.presentacion_id,
      producto: item.producto,
      presentacion: item,
    })),
    materias_primas: materias.materias_primas ?? [],
  }
}

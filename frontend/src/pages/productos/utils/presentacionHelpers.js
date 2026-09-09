/**
 * Funciones de ayuda puras para la manipulación y normalización de datos
 * de presentaciones y pivotes de productos.
 */

export const formularioVacio = () => ({
    id_presentacion: '',
    nombre: '',
    precio: '',
    descripcion: '',
    permite_personalizacion: false
});

export const normalizarBooleano = (valor) => {
    return (
        valor === true ||
        valor === 1 ||
        valor === '1'
    );
};

export const obtenerProductoRelacionado = (pres, productoId) => {
    return pres?.productos?.find(
        (prod) => prod.id_producto === productoId
    );
};

export const obtenerPivot = (pres, productoId) => {
    if (pres?.pivot) {
        return pres.pivot;
    }

    const productoRelacionado = obtenerProductoRelacionado(pres, productoId);

    if (productoRelacionado?.pivot) {
        return productoRelacionado.pivot;
    }

    if (pres?.productos?.[0]?.pivot) {
        return pres.productos[0].pivot;
    }

    return null;
};

export const obtenerPrecio = (pres, productoId) => {
    const pivot = obtenerPivot(pres, productoId);
    const precio = pivot?.precio;

    if (precio === undefined || precio === null || precio === '') {
        return 0;
    }

    const numero = parseFloat(precio);
    return Number.isNaN(numero) ? 0 : numero;
};

export const permitePersonalizacion = (pres, productoId) => {
    const pivot = obtenerPivot(pres, productoId);
    return normalizarBooleano(pivot?.permite_personalizacion);
};

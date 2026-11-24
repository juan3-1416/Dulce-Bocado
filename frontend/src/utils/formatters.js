/**
 * Formatea una cantidad (materia prima o producto) mostrando con 1 o 2 decimales según corresponda.
 * Si es un número entero exacto (ej. 50 huevos o 1000 gramos), se muestra como entero ("50")
 * para evitar la confusión visual con "50.000" (cincuenta mil).
 * Si tiene decimales, se muestra con máximo 2 decimales sin ceros redundantes (ej. "1.5", "2.25").
 *
 * @param {number|string} valor
 * @param {number} [maxDecimales=2]
 * @returns {string}
 */
export function formatearCantidad(valor, maxDecimales = 2) {
  if (valor === null || valor === undefined || valor === '') return '0'
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor))
  if (Number.isNaN(num)) return String(valor)

  if (Number.isInteger(num)) {
    return String(num)
  }

  const redondeado = Number(num.toFixed(maxDecimales))
  return String(redondeado)
}

/**
 * Formatea un precio monetario en Bolivianos siempre con exactamente 2 decimales (ej. "Bs 50.00").
 *
 * @param {number|string} valor
 * @returns {string}
 */
export function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Bs 0.00'
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor))
  if (Number.isNaN(num)) return 'Bs 0.00'
  return `Bs ${num.toFixed(2)}`
}

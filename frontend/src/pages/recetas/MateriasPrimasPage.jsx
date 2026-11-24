import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  actualizarMateriaPrima,
  cambiarEstadoMateriaPrima,
  crearMateriaPrima,
  listarMateriasPrimas,
} from '../../services/catalogoMateriaPrimaService'
import { useAuth } from '../../context/AuthContext'

// Opciones de compra comunes según el tipo de medida
const OPCIONES_COMPRA = {
  g: [
    { id: '1000', label: '1 Kilogramo (1,000 g)', factor: 1000 },
    { id: '5000', label: 'Bolsa de 5 kg (5,000 g)', factor: 5000 },
    { id: '10000', label: 'Bolsa de 10 kg (10,000 g)', factor: 10000 },
    { id: '25000', label: 'Saco de 25 kg (25,000 g)', factor: 25000 },
    { id: '453.6', label: '1 Libra (453.6 g)', factor: 453.6 },
    { id: '500', label: 'Medio kilo (500 g)', factor: 500 },
    { id: '100', label: '100 Gramos (100 g)', factor: 100 },
    { id: '1', label: '1 Gramo (1 g)', factor: 1 },
    { id: 'custom', label: 'Cantidad personalizada (en gramos)...', factor: null },
  ],
  ml: [
    { id: '1000', label: '1 Litro (1,000 ml)', factor: 1000 },
    { id: '2000', label: '2 Litros (2,000 ml)', factor: 2000 },
    { id: '3785', label: '1 Galón (3,785 ml)', factor: 3785 },
    { id: '500', label: 'Botella de 500 ml', factor: 500 },
    { id: '250', label: 'Envase de 250 ml', factor: 250 },
    { id: '100', label: 'Frasco de 100 ml (ej. esencias)', factor: 100 },
    { id: '1', label: '1 Mililitro (1 ml)', factor: 1 },
    { id: 'custom', label: 'Cantidad personalizada (en ml)...', factor: null },
  ],
  unidad: [
    { id: '30', label: 'Maple de 30 unidades (Huevos)', factor: 30 },
    { id: '12', label: '1 Docena (12 unidades)', factor: 12 },
    { id: '6', label: 'Media docena (6 unidades)', factor: 6 },
    { id: '1', label: '1 Unidad individual', factor: 1 },
    { id: '100', label: 'Ciento (100 unidades)', factor: 100 },
    { id: 'custom', label: 'Cantidad personalizada (unidades)...', factor: null },
  ],
}

function MateriasPrimasPage() {
  const { tienePermiso } = useAuth()
  const puedeGestionar = tienePermiso('recetas.gestionar')

  const [materiasPrimas, setMateriasPrimas] = useState([])
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [materiaPrimaSeleccionada, setMateriaPrimaSeleccionada] = useState(null)
  const [nombre, setNombre] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('g')
  const [costoUnitario, setCostoUnitario] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Asistente de cálculo de precio de compra
  const [presentacionCompraId, setPresentacionCompraId] = useState('1000')
  const [precioCompra, setPrecioCompra] = useState('')
  const [cantidadPersonalizada, setCantidadPersonalizada] = useState('')
  const [modoAvanzado, setModoAvanzado] = useState(false)

  const cargarMateriasPrimas = useCallback(async () => {
    try {
      setCargando(true)
      setError('')
      const respuesta = await listarMateriasPrimas({ buscar, estado })
      setMateriasPrimas(respuesta.materias_primas ?? [])
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudieron cargar las materias primas.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado])

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarMateriasPrimas()
    }, 300)
    return () => clearTimeout(temporizador)
  }, [cargarMateriasPrimas])

  // Factor de conversión actual
  const factorActual = useMemo(() => {
    if (presentacionCompraId === 'custom') {
      const val = parseFloat(cantidadPersonalizada)
      return val > 0 ? val : 1
    }
    const opciones = OPCIONES_COMPRA[unidadMedida] || []
    const encontrada = opciones.find((op) => op.id === presentacionCompraId)
    return encontrada?.factor || 1
  }, [unidadMedida, presentacionCompraId, cantidadPersonalizada])

  // Recalcular costoUnitario cuando cambia precioCompra o factor
  const recalcularCostoUnitario = (precio, factor) => {
    const p = parseFloat(precio)
    if (!isNaN(p) && p >= 0 && factor > 0) {
      const unitario = p / factor
      setCostoUnitario(unitario >= 0.0001 ? unitario.toFixed(4) : unitario.toFixed(6))
    }
  }

  // Manejar cambio de precio pagado
  const manejarCambioPrecioCompra = (valor) => {
    setPrecioCompra(valor)
    recalcularCostoUnitario(valor, factorActual)
  }

  // Manejar cambio de opción de presentación
  const manejarCambioPresentacion = (nuevoId) => {
    setPresentacionCompraId(nuevoId)
    let f = 1
    if (nuevoId === 'custom') {
      const val = parseFloat(cantidadPersonalizada)
      f = val > 0 ? val : 1
    } else {
      const opciones = OPCIONES_COMPRA[unidadMedida] || []
      const encontrada = opciones.find((op) => op.id === nuevoId)
      f = encontrada?.factor || 1
    }
    recalcularCostoUnitario(precioCompra, f)
  }

  // Manejar cambio de tipo de unidad (g / ml / unidad)
  const manejarCambioTipoUnidad = (nuevoTipo) => {
    setUnidadMedida(nuevoTipo)
    const opciones = OPCIONES_COMPRA[nuevoTipo] || []
    const defaultOption = opciones[0]?.id || '1'
    setPresentacionCompraId(defaultOption)
    const factor = opciones[0]?.factor || 1
    recalcularCostoUnitario(precioCompra, factor)
  }

  // Manejar cambio manual de costo unitario
  const manejarCambioCostoUnitarioManual = (valor) => {
    setCostoUnitario(valor)
    const c = parseFloat(valor)
    if (!isNaN(c) && c >= 0 && factorActual > 0) {
      setPrecioCompra((c * factorActual).toFixed(2))
    }
  }

  const abrirNueva = () => {
    setMateriaPrimaSeleccionada(null)
    setNombre('')
    setUnidadMedida('g')
    setPresentacionCompraId('1000')
    setPrecioCompra('')
    setCantidadPersonalizada('')
    setCostoUnitario('')
    setDescripcion('')
    setModoAvanzado(false)
    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const abrirEditar = (materiaPrima) => {
    setMateriaPrimaSeleccionada(materiaPrima)
    setNombre(materiaPrima.nombre ?? '')
    const tipo = materiaPrima.unidad_medida ?? 'g'
    setUnidadMedida(tipo)
    const costo = materiaPrima.costo_unitario ?? ''
    setCostoUnitario(costo)
    setDescripcion(materiaPrima.descripcion ?? '')

    // Inicializar calculadora con la presentación típica
    const opciones = OPCIONES_COMPRA[tipo] || []
    const defaultOption = opciones[0]?.id || '1'
    setPresentacionCompraId(defaultOption)
    const factor = opciones[0]?.factor || 1
    if (costo && !isNaN(costo)) {
      setPrecioCompra((parseFloat(costo) * factor).toFixed(2))
    } else {
      setPrecioCompra('')
    }
    setCantidadPersonalizada('')
    setModoAvanzado(false)
    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setMateriaPrimaSeleccionada(null)
  }

  const obtenerMensajeError = (errorPeticion) => {
    const errores = errorPeticion.data?.errors
    if (errores) {
      const primerError = Object.values(errores)[0]
      if (Array.isArray(primerError)) return primerError[0]
    }
    return errorPeticion.message || 'No se pudo guardar la materia prima.'
  }

  const guardar = async (event) => {
    event.preventDefault()
    const costoNum = Number(costoUnitario)

    if (isNaN(costoNum) || costoNum <= 0) {
      setError('Ingresa un precio o costo unitario válido mayor a cero.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      const datos = {
        nombre: nombre.trim(),
        unidad_medida: unidadMedida,
        costo_unitario: Number(costoNum.toFixed(4)),
        descripcion: descripcion.trim() || null,
        estado: materiaPrimaSeleccionada?.estado ?? true,
      }

      if (materiaPrimaSeleccionada) {
        await actualizarMateriaPrima(materiaPrimaSeleccionada.id_materia_prima, datos)
        setMensaje('Materia prima actualizada correctamente.')
      } else {
        await crearMateriaPrima(datos)
        setMensaje('Materia prima registrada correctamente.')
      }

      cerrarModal()
      await cargarMateriasPrimas()
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion))
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (materiaPrima) => {
    try {
      setError('')
      setMensaje('')
      const nuevoEstado = !materiaPrima.estado
      await cambiarEstadoMateriaPrima(materiaPrima.id_materia_prima, nuevoEstado)
      setMensaje(
        nuevoEstado
          ? 'Materia prima activada correctamente.'
          : 'Materia prima desactivada correctamente.',
      )
      await cargarMateriasPrimas()
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudo cambiar el estado de la materia prima.')
    }
  }

  // Previsualizaciones de equivalencia
  const costoNum = parseFloat(costoUnitario) || 0

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materias Primas e Ingredientes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra los ingredientes de tus recetas con cálculo claro de costos por kilo, litro o unidad.
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={abrirNueva}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 shadow-sm"
          >
            + Nueva Materia Prima
          </button>
        )}
      </div>

      {mensaje && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <label htmlFor="buscar_materia" className="mb-1 block text-sm font-medium text-gray-700">
            Buscar ingrediente
          </label>
          <input
            id="buscar_materia"
            type="text"
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            placeholder="Ej. Harina, Azúcar, Leche, Huevos..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        <div>
          <label htmlFor="estado_materia" className="mb-1 block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="estado_materia"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <option value="">Todos</option>
            <option value="1">Activas</option>
            <option value="0">Inactivas</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">Cargando materias primas...</div>
        ) : materiasPrimas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No existen materias primas registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Ingrediente / Materia Prima
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Tipo y Unidad Base
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Costo de Referencia y Equivalencias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {materiasPrimas.map((materiaPrima) => {
                  const costo = Number(materiaPrima.costo_unitario ?? 0)
                  return (
                    <tr key={materiaPrima.id_materia_prima} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {materiaPrima.nombre}
                        </div>
                        {materiaPrima.descripcion && (
                          <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                            {materiaPrima.descripcion}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {materiaPrima.unidad_medida === 'g' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            ⚖️ Peso / Gramos (g)
                          </span>
                        )}
                        {materiaPrima.unidad_medida === 'ml' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                            🥛 Volumen / Mililitros (ml)
                          </span>
                        )}
                        {materiaPrima.unidad_medida === 'unidad' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            🥚 Conteo / Unidades (u)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {materiaPrima.unidad_medida === 'g' && (
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              Bs {(costo * 1000).toFixed(2)}{' '}
                              <span className="text-xs font-normal text-gray-500">/ 1 kg</span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              Bs {(costo * 100).toFixed(2)} / 100g · Bs {costo.toFixed(4)} / g
                            </div>
                          </div>
                        )}
                        {materiaPrima.unidad_medida === 'ml' && (
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              Bs {(costo * 1000).toFixed(2)}{' '}
                              <span className="text-xs font-normal text-gray-500">/ 1 Litro</span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              Bs {(costo * 100).toFixed(2)} / 100ml · Bs {costo.toFixed(4)} / ml
                            </div>
                          </div>
                        )}
                        {materiaPrima.unidad_medida === 'unidad' && (
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              Bs {costo.toFixed(2)}{' '}
                              <span className="text-xs font-normal text-gray-500">/ unidad</span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              Bs {(costo * 12).toFixed(2)} / docena · Bs {(costo * 30).toFixed(2)} / maple (30u)
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {materiaPrima.estado ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Inactiva
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {puedeGestionar && (
                            <button
                              type="button"
                              onClick={() => abrirEditar(materiaPrima)}
                              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </button>
                          )}

                          {puedeGestionar && (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(materiaPrima)}
                              className={
                                materiaPrima.estado
                                  ? 'rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50'
                                  : 'rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50'
                              }
                            >
                              {materiaPrima.estado ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro / Edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[95vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {materiaPrimaSeleccionada ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardar} className="overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre de la materia prima
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Harina de Trigo 000, Azúcar Morena, Huevos..."
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              {/* Selector de Tipo de Medida */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de medida e ingrediente
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => manejarCambioTipoUnidad('g')}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      unidadMedida === 'g'
                        ? 'border-pink-600 bg-pink-50 text-pink-700 ring-2 ring-pink-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">⚖️</span>
                    <span className="mt-1 text-xs font-bold">Peso / Sólidos</span>
                    <span className="text-[10px] text-gray-500">Gramos (g) · Kilos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => manejarCambioTipoUnidad('ml')}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      unidadMedida === 'ml'
                        ? 'border-pink-600 bg-pink-50 text-pink-700 ring-2 ring-pink-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">🥛</span>
                    <span className="mt-1 text-xs font-bold">Volumen / Líquidos</span>
                    <span className="text-[10px] text-gray-500">Mililitros (ml) · Litros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => manejarCambioTipoUnidad('unidad')}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      unidadMedida === 'unidad'
                        ? 'border-pink-600 bg-pink-50 text-pink-700 ring-2 ring-pink-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">🥚</span>
                    <span className="mt-1 text-xs font-bold">Conteo / Piezas</span>
                    <span className="text-[10px] text-gray-500">Unidades (u) · Maples</span>
                  </button>
                </div>
              </div>

              {/* Asistente de Cálculo de Costo de Compra */}
              <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    💡 Calculadora de compra y costo unitario
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModoAvanzado(!modoAvanzado)}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-800"
                  >
                    {modoAvanzado ? 'Ocultar ajuste manual' : 'Modo manual'}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      ¿Cómo compras este producto?
                    </label>
                    <select
                      value={presentacionCompraId}
                      onChange={(e) => manejarCambioPresentacion(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
                    >
                      {OPCIONES_COMPRA[unidadMedida]?.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Precio total pagado (Bs)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-semibold text-gray-400">
                        Bs
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={precioCompra}
                        onChange={(e) => manejarCambioPrecioCompra(e.target.value)}
                        placeholder="Ej. 8.00"
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Si seleccionó presentación personalizada */}
                {presentacionCompraId === 'custom' && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Cantidad exacta en {unidadMedida === 'g' ? 'gramos (g)' : unidadMedida === 'ml' ? 'mililitros (ml)' : 'unidades'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={cantidadPersonalizada}
                      onChange={(e) => {
                        setCantidadPersonalizada(e.target.value)
                        const val = parseFloat(e.target.value)
                        recalcularCostoUnitario(precioCompra, val > 0 ? val : 1)
                      }}
                      placeholder={unidadMedida === 'g' ? 'Ej. 2500 para 2.5 kg' : unidadMedida === 'ml' ? 'Ej. 750' : 'Ej. 24'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {/* Modo avanzado para ver o editar el costo unitario directamente */}
                {modoAvanzado && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Costo base exacto por {unidadMedida} (Bs/{unidadMedida})
                    </label>
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={costoUnitario}
                      onChange={(e) => manejarCambioCostoUnitarioManual(e.target.value)}
                      placeholder="Ej. 0.0080"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Este es el valor exacto que se utilizará para calcular el costo de los ingredientes en las recetas.
                    </p>
                  </div>
                )}

                {/* Previsualización en vivo de equivalencias */}
                {costoNum > 0 && (
                  <div className="rounded-lg border border-pink-200 bg-white p-3 space-y-2">
                    <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Costo base para el sistema / recetas:
                      </span>
                      <span className="text-sm font-bold text-pink-700">
                        Bs {costoNum.toFixed(4)} <span className="text-xs font-normal text-gray-500">/ {unidadMedida}</span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">Equivalencias prácticas:</span>
                      <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        {unidadMedida === 'g' && (
                          <>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">100 gramos:</span>
                              <span className="font-bold text-gray-900">Bs {(costoNum * 100).toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">250 g (1 taza aprox):</span>
                              <span className="font-bold text-gray-900">Bs {(costoNum * 250).toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-pink-50 p-2 border border-pink-100">
                              <span className="block text-[10px] text-pink-600 font-semibold">1 Kilogramo (1,000 g):</span>
                              <span className="font-bold text-pink-800">Bs {(costoNum * 1000).toFixed(2)}</span>
                            </div>
                          </>
                        )}

                        {unidadMedida === 'ml' && (
                          <>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">100 mililitros:</span>
                              <span className="font-bold text-gray-900">Bs {(costoNum * 100).toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">250 ml (1 taza aprox):</span>
                              <span className="font-bold text-gray-900">Bs {(costoNum * 250).toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-pink-50 p-2 border border-pink-100">
                              <span className="block text-[10px] text-pink-600 font-semibold">1 Litro (1,000 ml):</span>
                              <span className="font-bold text-pink-800">Bs {(costoNum * 1000).toFixed(2)}</span>
                            </div>
                          </>
                        )}

                        {unidadMedida === 'unidad' && (
                          <>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">1 Unidad:</span>
                              <span className="font-bold text-gray-900">Bs {costoNum.toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <span className="block text-[10px] text-gray-500">1 Docena (12 u):</span>
                              <span className="font-bold text-gray-900">Bs {(costoNum * 12).toFixed(2)}</span>
                            </div>
                            <div className="rounded bg-pink-50 p-2 border border-pink-100">
                              <span className="block text-[10px] text-pink-600 font-semibold">Maple de Huevos (30 u):</span>
                              <span className="font-bold text-pink-800">Bs {(costoNum * 30).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descripción u observaciones (opcional)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Ej. Marca favorita, proveedor de compra, presentación habitual..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando || !nombre.trim() || costoNum <= 0}
                  className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50 shadow-sm"
                >
                  {guardando
                    ? 'Guardando...'
                    : materiaPrimaSeleccionada
                      ? 'Actualizar Materia Prima'
                      : 'Registrar Materia Prima'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default MateriasPrimasPage

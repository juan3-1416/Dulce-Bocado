import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  actualizarVenta,
  crearVenta,
} from '../../services/ventaService'

function crearFilaVacia() {
  return {
    uid: `${Date.now()}-${Math.random()}`,
    id_producto_presentacion: '',
    cantidad: '1',
    costo_personalizacion: '0',
    detalle_personalizacion: '',
  }
}

function VentaModal({
  abierto,
  onCerrar,
  onGuardado,
  clientes,
  productosPresentaciones,
  venta = null,
}) {
  const esEdicion = Boolean(venta)

  const [tipoCliente, setTipoCliente] =
    useState('registrado')

  const [idCliente, setIdCliente] =
    useState('')

  const [
    nombreClienteOcasional,
    setNombreClienteOcasional,
  ] = useState('')

  const [
    observaciones,
    setObservaciones,
  ] = useState('')

  const [items, setItems] =
    useState([
      crearFilaVacia(),
    ])

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!abierto) {
      return
    }

    setError('')

    if (venta) {
      if (venta.id_cliente) {
        setTipoCliente('registrado')
        setIdCliente(
          String(venta.id_cliente)
        )
        setNombreClienteOcasional('')
      } else {
        setTipoCliente('ocasional')
        setIdCliente('')
        setNombreClienteOcasional(
          venta.nombre_cliente_ocasional ??
            ''
        )
      }

      setObservaciones(
        venta.observaciones ?? ''
      )

      setItems(
        venta.detalles?.length
          ? venta.detalles.map(
              (detalle) => ({
                uid:
                  `detalle-${detalle.id_detalle_venta}`,

                id_producto_presentacion:
                  String(
                    detalle.id_producto_presentacion
                  ),

                cantidad:
                  String(
                    detalle.cantidad
                  ),

                costo_personalizacion:
                  String(
                    detalle.costo_personalizacion ??
                      0
                  ),

                detalle_personalizacion:
                  detalle.detalle_personalizacion ??
                  '',
              })
            )
          : [
              crearFilaVacia(),
            ]
      )

      return
    }

    setTipoCliente('registrado')
    setIdCliente('')
    setNombreClienteOcasional('')
    setObservaciones('')

    setItems([
      crearFilaVacia(),
    ])
  }, [abierto, venta])

  const idsSeleccionados = useMemo(
    () =>
      items
        .map((item) =>
          Number(
            item.id_producto_presentacion
          )
        )
        .filter(Boolean),
    [items]
  )

  const obtenerDetalleVenta = (id) =>
    venta?.detalles?.find(
      (detalle) =>
        Number(
          detalle.id_producto_presentacion
        ) === Number(id)
    )

  const obtenerProducto = (id) => {
    const producto =
      productosPresentaciones.find(
        (item) =>
          Number(
            item.id_producto_presentacion
          ) === Number(id)
      )

    if (producto) {
      return producto
    }

    const detalle =
      obtenerDetalleVenta(id)

    if (!detalle) {
      return null
    }

    return {
      id_producto_presentacion:
        detalle.id_producto_presentacion,

      precio:
        detalle.precio_unitario,

      producto:
        detalle.producto_presentacion
          ?.producto,

      presentacion:
        detalle.producto_presentacion
          ?.presentacion,
    }
  }

  const obtenerOpciones = (itemActual) => {
    const opciones = [
      ...productosPresentaciones,
    ]

    const idActual = Number(
      itemActual.id_producto_presentacion
    )

    if (
      idActual &&
      !opciones.some(
        (item) =>
          Number(
            item.id_producto_presentacion
          ) === idActual
      )
    ) {
      const productoActual =
        obtenerProducto(idActual)

      if (productoActual) {
        opciones.unshift(
          productoActual
        )
      }
    }

    return opciones
  }

  const agregarItem = () => {
    setItems((actuales) => [
      ...actuales,
      crearFilaVacia(),
    ])
  }

  const quitarItem = (uid) => {
    setItems((actuales) =>
      actuales.filter(
        (item) =>
          item.uid !== uid
      )
    )
  }

  const cambiarItem = (
    uid,
    campo,
    valor
  ) => {
    setItems((actuales) =>
      actuales.map((item) =>
        item.uid === uid
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    )
  }

  const calcularSubtotal = (item) => {
    const producto =
      obtenerProducto(
        item.id_producto_presentacion
      )

    if (!producto) {
      return 0
    }

    const precio =
      Number(producto.precio) || 0

    const cantidad =
      Number(item.cantidad) || 0

    const personalizacion =
      Number(
        item.costo_personalizacion
      ) || 0

    return (
      precio * cantidad +
      personalizacion
    )
  }

  const totalEstimado = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          calcularSubtotal(item),
        0
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, productosPresentaciones]
  )

  const obtenerMensajeError = (
    errorPeticion
  ) => {
    const errores =
      errorPeticion.data?.errors

    if (errores) {
      const primerError =
        Object.values(errores)[0]

      if (
        Array.isArray(primerError)
      ) {
        return primerError[0]
      }
    }

    return (
      errorPeticion.message ||
      'No se pudo guardar la venta.'
    )
  }

  const manejarSubmit = async (
    event
  ) => {
    event.preventDefault()

    if (
      tipoCliente ===
        'registrado' &&
      !idCliente
    ) {
      setError(
        'Selecciona un cliente registrado.'
      )
      return
    }

    if (
      tipoCliente ===
        'ocasional' &&
      !nombreClienteOcasional.trim()
    ) {
      setError(
        'Ingresa el nombre del cliente ocasional.'
      )
      return
    }

    if (items.length === 0) {
      setError(
        'La venta debe tener al menos un producto.'
      )
      return
    }

    const hayItemInvalido =
      items.some(
        (item) =>
          !item.id_producto_presentacion ||
          Number(item.cantidad) <= 0 ||
          Number(
            item.costo_personalizacion
          ) < 0
      )

    if (hayItemInvalido) {
      setError(
        'Completa correctamente todos los productos de la venta.'
      )
      return
    }

    const ids = items.map(
      (item) =>
        Number(
          item.id_producto_presentacion
        )
    )

    if (
      new Set(ids).size !==
      ids.length
    ) {
      setError(
        'No puedes repetir el mismo producto y presentación.'
      )
      return
    }

    try {
      setGuardando(true)
      setError('')

      const datos = {
        id_cliente:
          tipoCliente ===
          'registrado'
            ? Number(idCliente)
            : null,

        nombre_cliente_ocasional:
          tipoCliente ===
          'ocasional'
            ? nombreClienteOcasional.trim()
            : null,

        observaciones:
          observaciones.trim() ||
          null,

        items: items.map(
          (item) => ({
            id_producto_presentacion:
              Number(
                item.id_producto_presentacion
              ),

            cantidad:
              Number(item.cantidad),

            costo_personalizacion:
              Number(
                item.costo_personalizacion ||
                  0
              ),

            detalle_personalizacion:
              item.detalle_personalizacion
                .trim() || null,
          })
        ),
      }

      if (esEdicion) {
        await actualizarVenta(
          venta.id_venta,
          datos
        )

        await onGuardado(
          'Venta actualizada correctamente.'
        )
      } else {
        await crearVenta(datos)

        await onGuardado(
          'Venta registrada correctamente.'
        )
      }

      onCerrar()
    } catch (errorPeticion) {
      setError(
        obtenerMensajeError(
          errorPeticion
        )
      )
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {esEdicion
                ? 'Editar Venta'
                : 'Nueva Venta'}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Registra los productos, cantidades y datos del cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={manejarSubmit}
          className="space-y-6 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-4 font-semibold text-gray-900">
              Cliente
            </h3>

            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="tipo_cliente"
                  value="registrado"
                  checked={
                    tipoCliente ===
                    'registrado'
                  }
                  onChange={() => {
                    setTipoCliente(
                      'registrado'
                    )

                    setNombreClienteOcasional(
                      ''
                    )
                  }}
                />

                Cliente registrado
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="tipo_cliente"
                  value="ocasional"
                  checked={
                    tipoCliente ===
                    'ocasional'
                  }
                  onChange={() => {
                    setTipoCliente(
                      'ocasional'
                    )

                    setIdCliente('')
                  }}
                />

                Cliente ocasional
              </label>
            </div>

            {tipoCliente ===
            'registrado' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cliente
                </label>

                <select
                  value={idCliente}
                  onChange={(event) =>
                    setIdCliente(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">
                    Seleccionar cliente
                  </option>

                  {clientes.map(
                    (cliente) => (
                      <option
                        key={
                          cliente.id_cliente
                        }
                        value={
                          cliente.id_cliente
                        }
                      >
                        {cliente.nombre}
                        {cliente.apellido
                          ? ` ${cliente.apellido}`
                          : ''}
                        {cliente.ci_nit
                          ? ` — CI/NIT: ${cliente.ci_nit}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre del cliente
                </label>

                <input
                  type="text"
                  value={
                    nombreClienteOcasional
                  }
                  onChange={(event) =>
                    setNombreClienteOcasional(
                      event.target.value
                    )
                  }
                  required
                  maxLength={150}
                  placeholder="Ej. Cliente mostrador"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Productos
                </h3>

                <p className="text-sm text-gray-500">
                  El precio final será recalculado por el servidor.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarItem}
                className="rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
              >
                + Agregar Producto
              </button>
            </div>

            {items.map((item) => {
              const productoActual =
                obtenerProducto(
                  item.id_producto_presentacion
                )

              const opciones =
                obtenerOpciones(item)

              return (
                <div
                  key={item.uid}
                  className="space-y-4 rounded-xl border border-gray-200 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[2fr_110px_150px_auto]">

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Producto y presentación
                      </label>

                      <select
                        value={
                          item.id_producto_presentacion
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarItem(
                            item.uid,
                            'id_producto_presentacion',
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="">
                          Seleccionar
                        </option>

                        {opciones.map(
                          (producto) => {
                            const id =
                              producto.id_producto_presentacion

                            const seleccionadoEnOtraFila =
                              idsSeleccionados.includes(
                                Number(id)
                              ) &&
                              Number(
                                item.id_producto_presentacion
                              ) !==
                                Number(id)

                            return (
                              <option
                                key={id}
                                value={id}
                                disabled={
                                  seleccionadoEnOtraFila
                                }
                              >
                                {
                                  producto.producto
                                    ?.nombre
                                }
                                {' — '}
                                {
                                  producto.presentacion
                                    ?.nombre
                                }
                                {' — Bs '}
                                {Number(
                                  producto.precio
                                ).toFixed(
                                  2
                                )}
                              </option>
                            )
                          }
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Cantidad
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          item.cantidad
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarItem(
                            item.uid,
                            'cantidad',
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Personalización Bs
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.costo_personalizacion
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarItem(
                            item.uid,
                            'costo_personalizacion',
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={
                          items.length ===
                          1
                        }
                        onClick={() =>
                          quitarItem(
                            item.uid
                          )
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Detalle de personalización
                      </label>

                      <input
                        type="text"
                        maxLength={1000}
                        value={
                          item.detalle_personalizacion
                        }
                        onChange={(
                          event
                        ) =>
                          cambiarItem(
                            item.uid,
                            'detalle_personalizacion',
                            event.target.value
                          )
                        }
                        placeholder="Ej. Mensaje Feliz Cumpleaños"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>

                    <div className="flex items-end justify-between rounded-lg bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-xs text-gray-500">
                          Precio unitario
                        </p>

                        <p className="font-semibold text-gray-900">
                          Bs{' '}
                          {Number(
                            productoActual
                              ?.precio ?? 0
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Subtotal estimado
                        </p>

                        <p className="font-bold text-pink-600">
                          Bs{' '}
                          {calcularSubtotal(
                            item
                          ).toFixed(
                            2
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observaciones
            </label>

            <textarea
              value={observaciones}
              onChange={(event) =>
                setObservaciones(
                  event.target.value
                )
              }
              rows={3}
              maxLength={2000}
              placeholder="Observaciones adicionales..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total estimado
              </p>

              <p className="text-2xl font-bold text-pink-600">
                Bs{' '}
                {totalEstimado.toFixed(
                  2
                )}
              </p>

              <p className="text-xs text-gray-400">
                El backend calculará nuevamente el total antes de guardar.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCerrar}
                disabled={guardando}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : esEdicion
                    ? 'Guardar Cambios'
                    : 'Registrar Venta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VentaModal
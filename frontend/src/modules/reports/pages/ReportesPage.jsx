import { useState } from 'react'

import {
  descargarReportePdf,
  enviarReporteCorreo,
  obtenerReporteInventario,
  obtenerReportePedidos,
  obtenerReporteVentas,
} from '../../services/reporteService'

const FILTROS_INICIALES = {
  ventas: {
    fecha_desde: '',
    fecha_hasta: '',
    estado: '',
    id_cliente: '',
    id_usuario: '',
  },
  pedidos: {
    fecha_desde: '',
    fecha_hasta: '',
    entrega_desde: '',
    entrega_hasta: '',
    estado: '',
    id_cliente: '',
    id_usuario: '',
  },
  inventario: {
    id_almacen: '',
    tipo: '',
    stock_critico: false,
  },
}

function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState('ventas')

  const [filtros, setFiltros] = useState(
    FILTROS_INICIALES
  )

  const [destinatarios, setDestinatarios] =
    useState('')

  const [cargando, setCargando] =
    useState(null)

  const [resultado, setResultado] =
    useState(null)

  const [mensaje, setMensaje] =
    useState(null)

  const [error, setError] =
    useState(null)

  const filtrosActuales =
    filtros[tipoReporte]

  const limpiarMensajes = () => {
    setMensaje(null)
    setError(null)
  }

  const actualizarFiltro = (
    nombre,
    valor
  ) => {
    setFiltros((actuales) => ({
      ...actuales,
      [tipoReporte]: {
        ...actuales[tipoReporte],
        [nombre]: valor,
      },
    }))

    setResultado(null)
    limpiarMensajes()
  }

  const obtenerParametros = () => {
    const parametros = {}

    Object.entries(
      filtrosActuales
    ).forEach(([clave, valor]) => {
      if (clave === 'stock_critico') {
        if (valor === true) {
          parametros[clave] = '1'
        }

        return
      }

      if (
        valor !== '' &&
        valor !== null &&
        valor !== undefined
      ) {
        parametros[clave] = valor
      }
    })

    return parametros
  }

  const validarFechas = () => {
    if (
      filtrosActuales.fecha_desde &&
      filtrosActuales.fecha_hasta &&
      filtrosActuales.fecha_hasta <
        filtrosActuales.fecha_desde
    ) {
      setError({
        message:
          'La fecha hasta no puede ser anterior a la fecha desde.',
      })

      return false
    }

    if (
      tipoReporte === 'pedidos' &&
      filtrosActuales.entrega_desde &&
      filtrosActuales.entrega_hasta &&
      filtrosActuales.entrega_hasta <
        filtrosActuales.entrega_desde
    ) {
      setError({
        message:
          'La fecha final de entrega no puede ser anterior a la fecha inicial.',
      })

      return false
    }

    return true
  }

  const obtenerCorreos = () =>
    destinatarios
      .split(/[,;\n]+/)
      .map((correo) =>
        correo.trim()
      )
      .filter(Boolean)

  const consultarReporte = async () => {
    limpiarMensajes()
    setResultado(null)

    if (!validarFechas()) {
      return
    }

    setCargando('consultar')

    const parametros =
      obtenerParametros()

    try {
      let respuesta

      if (
        tipoReporte === 'ventas'
      ) {
        respuesta =
          await obtenerReporteVentas(
            parametros
          )
      } else if (
        tipoReporte === 'pedidos'
      ) {
        respuesta =
          await obtenerReportePedidos(
            parametros
          )
      } else {
        respuesta =
          await obtenerReporteInventario(
            parametros
          )
      }

      setResultado(
        respuesta.data
      )
    } catch (err) {
      setError({
        status: err.status || 0,
        message:
          err.message ||
          'No se pudo consultar el reporte.',
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const descargarPdf = async () => {
    limpiarMensajes()

    if (!validarFechas()) {
      return
    }

    setCargando('pdf')

    try {
      await descargarReportePdf(
        tipoReporte,
        obtenerParametros()
      )

      setMensaje({
        texto:
          'El reporte PDF fue generado y descargado correctamente.',
      })
    } catch (err) {
      setError({
        status: err.status || 0,
        message:
          err.message ||
          'No se pudo generar el PDF.',
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const enviarCorreo = async () => {
    limpiarMensajes()

    if (!validarFechas()) {
      return
    }

    const correos =
      obtenerCorreos()

    if (correos.length === 0) {
      setError({
        message:
          'Ingresa al menos una dirección de correo electrónico.',
      })

      return
    }

    setCargando('correo')

    try {
      const respuesta =
        await enviarReporteCorreo(
          tipoReporte,
          correos,
          obtenerParametros()
        )

      setMensaje({
        texto:
          respuesta.message,
        data: respuesta,
      })
    } catch (err) {
      setError({
        status: err.status || 0,
        message:
          err.message ||
          'No se pudo enviar el reporte.',
        data: err.data || null,
      })
    } finally {
      setCargando(null)
    }
  }

  const limpiarFiltros = () => {
    setFiltros((actuales) => ({
      ...actuales,
      [tipoReporte]: {
        ...FILTROS_INICIALES[
          tipoReporte
        ],
      },
    }))

    setResultado(null)
    limpiarMensajes()
  }

  const cambiarTipo = (
    nuevoTipo
  ) => {
    setTipoReporte(nuevoTipo)
    setResultado(null)
    limpiarMensajes()
  }

  const formatoDinero = (
    valor
  ) => {
    const numero =
      Number(valor || 0)

    return new Intl.NumberFormat(
      'es-BO',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(numero)
  }

  const tituloResumen = (
    clave
  ) => {
    const titulos = {
      cantidad:
        'Registros',
      ventas_validas:
        'Ventas válidas',
      anuladas:
        'Anuladas',
      total:
        'Total',
      total_ventas:
        'Total ventas',
      total_pedidos:
        'Total pedidos',
      total_pagado:
        'Total pagado',
      saldo:
        'Saldo pendiente',
      stock_total:
        'Stock total',
      stock_critico:
        'Stock crítico',
      cantidad_criticos:
        'Críticos',
    }

    return (
      titulos[clave] ||
      clave
        .replaceAll('_', ' ')
        .replace(
          /^\w/,
          (letra) =>
            letra.toUpperCase()
        )
    )
  }

  const valorResumen = (
    clave,
    valor
  ) => {
    if (
      [
        'total',
        'total_ventas',
        'total_pedidos',
        'total_pagado',
        'saldo',
      ].includes(clave)
    ) {
      return `Bs ${formatoDinero(
        valor
      )}`
    }

    return String(valor)
  }

  const renderFiltrosVentas =
    () => (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CampoFecha
          label="Fecha desde"
          value={
            filtrosActuales.fecha_desde
          }
          onChange={(valor) =>
            actualizarFiltro(
              'fecha_desde',
              valor
            )
          }
        />

        <CampoFecha
          label="Fecha hasta"
          value={
            filtrosActuales.fecha_hasta
          }
          onChange={(valor) =>
            actualizarFiltro(
              'fecha_hasta',
              valor
            )
          }
        />

        <CampoTexto
          label="Estado"
          placeholder="Ej. REGISTRADA"
          value={
            filtrosActuales.estado
          }
          onChange={(valor) =>
            actualizarFiltro(
              'estado',
              valor.toUpperCase()
            )
          }
        />

        <CampoNumero
          label="ID cliente"
          placeholder="Todos"
          value={
            filtrosActuales.id_cliente
          }
          onChange={(valor) =>
            actualizarFiltro(
              'id_cliente',
              valor
            )
          }
        />

        <CampoNumero
          label="ID vendedor"
          placeholder="Todos"
          value={
            filtrosActuales.id_usuario
          }
          onChange={(valor) =>
            actualizarFiltro(
              'id_usuario',
              valor
            )
          }
        />
      </div>
    )

  const renderFiltrosPedidos =
    () => (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CampoFecha
          label="Pedido desde"
          value={
            filtrosActuales.fecha_desde
          }
          onChange={(valor) =>
            actualizarFiltro(
              'fecha_desde',
              valor
            )
          }
        />

        <CampoFecha
          label="Pedido hasta"
          value={
            filtrosActuales.fecha_hasta
          }
          onChange={(valor) =>
            actualizarFiltro(
              'fecha_hasta',
              valor
            )
          }
        />

        <CampoFecha
          label="Entrega desde"
          value={
            filtrosActuales.entrega_desde
          }
          onChange={(valor) =>
            actualizarFiltro(
              'entrega_desde',
              valor
            )
          }
        />

        <CampoFecha
          label="Entrega hasta"
          value={
            filtrosActuales.entrega_hasta
          }
          onChange={(valor) =>
            actualizarFiltro(
              'entrega_hasta',
              valor
            )
          }
        />

        <CampoTexto
          label="Estado"
          placeholder="Ej. PENDIENTE"
          value={
            filtrosActuales.estado
          }
          onChange={(valor) =>
            actualizarFiltro(
              'estado',
              valor.toUpperCase()
            )
          }
        />

        <CampoNumero
          label="ID cliente"
          placeholder="Todos"
          value={
            filtrosActuales.id_cliente
          }
          onChange={(valor) =>
            actualizarFiltro(
              'id_cliente',
              valor
            )
          }
        />

        <CampoNumero
          label="ID responsable"
          placeholder="Todos"
          value={
            filtrosActuales.id_usuario
          }
          onChange={(valor) =>
            actualizarFiltro(
              'id_usuario',
              valor
            )
          }
        />
      </div>
    )

  const renderFiltrosInventario =
    () => (
      <div className="grid gap-4 md:grid-cols-3">
        <CampoNumero
          label="ID almacén"
          placeholder="Todos"
          value={
            filtrosActuales.id_almacen
          }
          onChange={(valor) =>
            actualizarFiltro(
              'id_almacen',
              valor
            )
          }
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tipo
          </label>

          <select
            value={
              filtrosActuales.tipo
            }
            onChange={(event) =>
              actualizarFiltro(
                'tipo',
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          >
            <option value="">
              Todos
            </option>

            <option value="materia_prima">
              Materia prima
            </option>

            <option value="producto">
              Producto
            </option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5">
            <input
              type="checkbox"
              checked={
                filtrosActuales.stock_critico
              }
              onChange={(event) =>
                actualizarFiltro(
                  'stock_critico',
                  event.target.checked
                )
              }
              className="h-4 w-4 accent-pink-600"
            />

            <span className="text-sm font-medium text-slate-700">
              Solo stock crítico
            </span>
          </label>
        </div>
      </div>
    )

  const renderTabla = () => {
    if (
      !resultado ||
      !Array.isArray(
        resultado.datos
      )
    ) {
      return null
    }

    if (
      resultado.datos.length === 0
    ) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No existen resultados para
          los filtros seleccionados.
        </div>
      )
    }

    if (
      tipoReporte === 'ventas'
    ) {
      return (
        <TablaVentas
          datos={resultado.datos}
          formatoDinero={
            formatoDinero
          }
        />
      )
    }

    if (
      tipoReporte === 'pedidos'
    ) {
      return (
        <TablaPedidos
          datos={resultado.datos}
          formatoDinero={
            formatoDinero
          }
        />
      )
    }

    return (
      <TablaInventario
        datos={resultado.datos}
      />
    )
  }

  const nombresTipo = {
    ventas:
      'Reporte de Ventas',
    pedidos:
      'Reporte de Pedidos',
    inventario:
      'Reporte de Inventario',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reportes Generales
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Genera reportes
          parametrizados, descárgalos
          en PDF o envíalos por correo
          electrónico.
        </p>
      </div>

      {/* TIPO DE REPORTE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Tipo de reporte
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [
              'ventas',
              'Ventas',
              'Ventas y montos registrados',
            ],
            [
              'pedidos',
              'Pedidos',
              'Pedidos, pagos y saldos',
            ],
            [
              'inventario',
              'Inventario',
              'Existencias y stock crítico',
            ],
          ].map(
            ([
              tipo,
              titulo,
              descripcion,
            ]) => (
              <button
                key={tipo}
                type="button"
                onClick={() =>
                  cambiarTipo(tipo)
                }
                className={`rounded-xl border p-4 text-left transition ${
                  tipoReporte === tipo
                    ? 'border-pink-600 bg-pink-50'
                    : 'border-slate-200 bg-white hover:border-pink-300'
                }`}
              >
                <p
                  className={`font-semibold ${
                    tipoReporte === tipo
                      ? 'text-pink-700'
                      : 'text-slate-900'
                  }`}
                >
                  {titulo}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {descripcion}
                </p>
              </button>
            )
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Parámetros del reporte
            </h2>

            <p className="text-sm text-slate-500">
              Los parámetros se aplican
              también al PDF y al envío
              por correo.
            </p>
          </div>

          <button
            type="button"
            onClick={
              limpiarFiltros
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>

        {tipoReporte ===
          'ventas' &&
          renderFiltrosVentas()}

        {tipoReporte ===
          'pedidos' &&
          renderFiltrosPedidos()}

        {tipoReporte ===
          'inventario' &&
          renderFiltrosInventario()}
      </div>

      {/* CORREOS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="destinatarios"
          className="block font-semibold text-slate-900"
        >
          Destinatarios
        </label>

        <p className="mt-1 text-sm text-slate-500">
          Para múltiples
          destinatarios, separa los
          correos con coma o punto y
          coma.
        </p>

        <input
          id="destinatarios"
          type="text"
          value={destinatarios}
          onChange={(event) =>
            setDestinatarios(
              event.target.value
            )
          }
          placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
        />
      </div>

      {/* ACCIONES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">
            {
              nombresTipo[
                tipoReporte
              ]
            }
          </h2>

          <p className="text-sm text-slate-500">
            Selecciona la operación
            que deseas realizar.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={
              cargando !== null
            }
            onClick={
              consultarReporte
            }
            className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ===
            'consultar'
              ? 'Consultando...'
              : 'Generar reporte'}
          </button>

          <button
            type="button"
            disabled={
              cargando !== null
            }
            onClick={descargarPdf}
            className="rounded-xl border border-pink-600 px-4 py-3 text-sm font-semibold text-pink-600 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando === 'pdf'
              ? 'Generando PDF...'
              : 'Descargar PDF'}
          </button>

          <button
            type="button"
            disabled={
              cargando !== null
            }
            onClick={enviarCorreo}
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ===
            'correo'
              ? 'Enviando...'
              : 'Enviar por correo'}
          </button>
        </div>
      </div>

      {/* ÉXITO */}
      {mensaje && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-semibold text-green-800">
            Operación completada
          </h2>

          <p className="mt-1 text-sm text-green-700">
            {mensaje.texto}
          </p>

          {mensaje.data
            ?.correos && (
            <p className="mt-2 text-sm text-green-700">
              Destinatarios:{' '}
              {mensaje.data.correos.join(
                ', '
              )}
            </p>
          )}

          {mensaje.data
            ?.archivo && (
            <p className="mt-1 text-sm text-green-700">
              Archivo:{' '}
              {
                mensaje.data
                  .archivo
              }
            </p>
          )}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">
            No se pudo completar la
            operación
          </h2>

          {error.status > 0 && (
            <p className="mt-2 text-sm font-medium text-red-700">
              HTTP {error.status}
            </p>
          )}

          <p className="mt-1 text-sm text-red-700">
            {error.message}
          </p>

          {error.data?.archivo && (
            <div className="mt-3 rounded-xl border border-red-100 bg-white p-3 text-sm text-slate-700">
              <p className="font-semibold">
                El PDF sí fue generado
                y guardado.
              </p>

              <p>
                Archivo:{' '}
                {
                  error.data
                    .archivo
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* RESULTADOS */}
      {resultado && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {resultado.titulo}
            </h2>

            <p className="text-sm text-slate-500">
              Resultados obtenidos con
              los parámetros
              seleccionados.
            </p>
          </div>

          {resultado.resumen && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(
                resultado.resumen
              ).map(
                ([
                  clave,
                  valor,
                ]) => (
                  <div
                    key={clave}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tituloResumen(
                        clave
                      )}
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {valorResumen(
                        clave,
                        valor
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {renderTabla()}
        </div>
      )}
    </div>
  )
}

function CampoFecha({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
      />
    </div>
  )
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
      />
    </div>
  )
}

function CampoNumero({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="number"
        min="1"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
      />
    </div>
  )
}

function TablaVentas({
  datos,
  formatoDinero,
}) {
  return (
    <TablaBase>
      <thead>
        <tr>
          <Th>ID</Th>
          <Th>Fecha</Th>
          <Th>Cliente</Th>
          <Th>Vendedor</Th>
          <Th>Estado</Th>
          <Th derecha>Total Bs</Th>
        </tr>
      </thead>

      <tbody>
        {datos.map((venta) => (
          <tr
            key={
              venta.id_venta
            }
            className="border-t border-slate-100"
          >
            <Td>
              {venta.id_venta}
            </Td>

            <Td>
              {venta.fecha_venta}
            </Td>

            <Td>
              {venta.cliente ||
                '-'}
            </Td>

            <Td>
              {venta.vendedor ||
                '-'}
            </Td>

            <Td>
              {venta.estado}
            </Td>

            <Td derecha>
              {formatoDinero(
                venta.total
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </TablaBase>
  )
}

function TablaPedidos({
  datos,
  formatoDinero,
}) {
  return (
    <TablaBase>
      <thead>
        <tr>
          <Th>ID</Th>
          <Th>Pedido</Th>
          <Th>Entrega</Th>
          <Th>Cliente</Th>
          <Th>Estado</Th>
          <Th derecha>Total</Th>
          <Th derecha>
            Pagado
          </Th>
          <Th derecha>
            Saldo
          </Th>
        </tr>
      </thead>

      <tbody>
        {datos.map(
          (pedido) => (
            <tr
              key={
                pedido.id_pedido
              }
              className="border-t border-slate-100"
            >
              <Td>
                {
                  pedido.id_pedido
                }
              </Td>

              <Td>
                {
                  pedido.fecha_pedido
                }
              </Td>

              <Td>
                {pedido.fecha_entrega ||
                  '-'}
                {pedido.hora_entrega
                  ? ` ${pedido.hora_entrega}`
                  : ''}
              </Td>

              <Td>
                {pedido.cliente ||
                  '-'}
              </Td>

              <Td>
                {pedido.estado}
              </Td>

              <Td derecha>
                {formatoDinero(
                  pedido.total
                )}
              </Td>

              <Td derecha>
                {formatoDinero(
                  pedido.total_pagado
                )}
              </Td>

              <Td derecha>
                {formatoDinero(
                  pedido.saldo
                )}
              </Td>
            </tr>
          )
        )}
      </tbody>
    </TablaBase>
  )
}

function TablaInventario({
  datos,
}) {
  return (
    <TablaBase>
      <thead>
        <tr>
          <Th>Almacén</Th>
          <Th>Tipo</Th>
          <Th>Ítem</Th>
          <Th>Presentación</Th>
          <Th derecha>
            Cantidad
          </Th>
          <Th>Unidad</Th>
          <Th>Estado</Th>
        </tr>
      </thead>

      <tbody>
        {datos.map((item) => (
          <tr
            key={
              item.id_inventario
            }
            className="border-t border-slate-100"
          >
            <Td>
              {item.almacen}
            </Td>

            <Td>
              {item.tipo ===
              'materia_prima'
                ? 'Materia prima'
                : 'Producto'}
            </Td>

            <Td>
              {item.nombre}
            </Td>

            <Td>
              {item.presentacion ||
                '-'}
            </Td>

            <Td derecha>
              {item.cantidad}
            </Td>

            <Td>
              {item.unidad_medida ||
                '-'}
            </Td>

            <Td>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  item.stock_critico
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {item.stock_critico
                  ? 'Crítico'
                  : 'Normal'}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </TablaBase>
  )
}

function TablaBase({
  children,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        {children}
      </table>
    </div>
  )
}

function Th({
  children,
  derecha = false,
}) {
  return (
    <th
      className={`bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 ${
        derecha
          ? 'text-right'
          : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  derecha = false,
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-slate-700 ${
        derecha
          ? 'text-right'
          : 'text-left'
      }`}
    >
      {children}
    </td>
  )
}

export default ReportesPage
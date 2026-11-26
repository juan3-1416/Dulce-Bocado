import { useCallback, useEffect, useState } from 'react'
import {
  anularRecibo,
  descargarPdfRecibo,
  obtenerRecibo,
  registrarImpresionRecibo,
} from '../../services/reciboService'

function numeroRecibo(recibo) {
  if (recibo?.numero) return recibo.numero
  const id = recibo?.id_recibo ?? recibo
  return `REC-${String(id || 0).padStart(6, '0')}`
}

function formatearFecha(fecha) {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function obtenerDetallesRecibo(recibo) {
  const snapshotDetalles = recibo?.snapshot?.detalles
  if (Array.isArray(snapshotDetalles) && snapshotDetalles.length > 0) {
    return snapshotDetalles.map((d) => ({
      producto: d.descripcion || d.producto || 'Item',
      presentacion: d.presentacion || '-',
      cantidad: d.cantidad ?? 1,
      precio_unitario: d.precio_unitario ?? '0.00',
      subtotal: d.subtotal ?? '0.00',
    }))
  }

  const detallesVenta = recibo?.pago?.venta?.detalles
  if (Array.isArray(detallesVenta) && detallesVenta.length > 0) {
    return detallesVenta.map((d) => ({
      producto: d.producto_presentacion?.producto?.nombre ?? 'Producto',
      presentacion: d.producto_presentacion?.presentacion?.nombre ?? '-',
      cantidad: d.cantidad ?? 1,
      precio_unitario: d.precio_unitario ?? '0.00',
      subtotal: d.subtotal ?? '0.00',
    }))
  }

  return []
}

function construirHtmlImpresion(recibo) {
  const detalles = obtenerDetallesRecibo(recibo)
  const numRecibo = numeroRecibo(recibo)
  const operacionTipo = recibo.snapshot?.origen_tipo || (recibo.pago?.id_venta ? 'Venta' : 'Pedido')
  const operacionId = recibo.snapshot?.origen_id || (recibo.pago?.id_venta ?? recibo.pago?.id_pedido ?? '-')

  const filas = detalles
    .map((detalle) => `
        <tr>
          <td>${escaparHtml(detalle.producto)}</td>
          <td>${escaparHtml(detalle.presentacion)}</td>
          <td class="center">${escaparHtml(detalle.cantidad)}</td>
          <td class="right">Bs ${Number(detalle.precio_unitario).toFixed(2)}</td>
          <td class="right">Bs ${Number(detalle.subtotal).toFixed(2)}</td>
        </tr>
      `)
    .join('')

  const marcaAnulado =
    recibo.estado === 'ANULADO'
      ? '<div class="anulado">ANULADO</div>'
      : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escaparHtml(numRecibo)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      background: #ffffff;
      color: #222222;
    }

    .recibo {
      position: relative;
      width: 760px;
      margin: 20px auto;
      padding: 32px;
      border: 1px solid #d1d5db;
    }

    .encabezado {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #222;
      padding-bottom: 18px;
    }

    .encabezado h1 {
      margin: 0;
      font-size: 24px;
      color: #78350f;
    }

    .encabezado h2 {
      margin: 4px 0 0 0;
      font-size: 14px;
      font-weight: normal;
      color: #6b7280;
    }

    .numero {
      text-align: right;
    }

    .numero strong {
      display: block;
      font-size: 18px;
      color: #1f2937;
    }

    .numero span {
      display: inline-block;
      margin-top: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      background: ${recibo.estado === 'ANULADO' ? '#fee2e2; color: #991b1b;' : '#dcfce7; color: #166534;'}
    }

    .seccion {
      margin-top: 18px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .campo {
      margin: 4px 0;
      font-size: 13px;
    }

    .campo strong {
      display: inline-block;
      width: 125px;
      color: #4b5563;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 13px;
    }

    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
    }

    th {
      background: #f3f4f6;
      text-align: left;
    }

    .right {
      text-align: right;
    }

    .center {
      text-align: center;
    }

    .monto {
      margin-top: 22px;
      border: 2px solid #222;
      padding: 15px;
      text-align: right;
      font-size: 20px;
      font-weight: bold;
    }

    .nota {
      margin-top: 26px;
      padding-top: 15px;
      border-top: 1px solid #d1d5db;
      font-size: 11px;
      text-align: center;
      color: #555;
    }

    .anulado {
      position: absolute;
      top: 40%;
      left: 15%;
      transform: rotate(-25deg);
      font-size: 85px;
      font-weight: bold;
      color: #ef4444;
      opacity: 0.18;
      letter-spacing: 6px;
    }

    @media print {
      body {
        margin: 0;
      }

      .recibo {
        border: none;
        margin: 0 auto;
      }
    }
  </style>
</head>

<body>
  <div class="recibo">
    ${marcaAnulado}

    <div class="encabezado">
      <div>
        <h1>Dulce Bocado</h1>
        <h2>Recibo interno de control de cobro</h2>
      </div>

      <div class="numero">
        <strong>${escaparHtml(numRecibo)}</strong>
        <span>Estado: ${escaparHtml(recibo.estado)}</span>
      </div>
    </div>

    <div class="seccion grid">
      <div>
        <p class="campo">
          <strong>Cliente:</strong>
          ${escaparHtml(recibo.nombre_cliente)}
        </p>

        <p class="campo">
          <strong>CI / NIT:</strong>
          ${escaparHtml(recibo.ci_nit_cliente || 'No registrado')}
        </p>

        <p class="campo">
          <strong>Operación:</strong>
          ${escaparHtml(operacionTipo)} #${escaparHtml(operacionId)}
        </p>

        <p class="campo">
          <strong>Pago:</strong>
          #${escaparHtml(recibo.id_pago || recibo.pago_id)}
        </p>
      </div>

      <div>
        <p class="campo">
          <strong>Fecha de pago:</strong>
          ${escaparHtml(formatearFecha(recibo.fecha_pago || recibo.pago?.confirmado_at))}
        </p>

        <p class="campo">
          <strong>Fecha emisión:</strong>
          ${escaparHtml(formatearFecha(recibo.fecha_emision || recibo.emitido_at))}
        </p>

        <p class="campo">
          <strong>Método:</strong>
          ${escaparHtml(recibo.metodo_pago)}
        </p>

        <p class="campo">
          <strong>Impresiones:</strong>
          ${escaparHtml(recibo.cantidad_impresiones ?? 0)}
        </p>
      </div>
    </div>

    ${
      detalles.length > 0
        ? `
        <div class="seccion">
          <strong>Detalle de productos</strong>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Presentación</th>
                <th class="center">Cant.</th>
                <th class="right">Precio</th>
                <th class="right">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              ${filas}
            </tbody>
          </table>
        </div>
      `
        : ''
    }

    <div class="monto">
      Monto recibido: Bs ${Number(recibo.monto).toFixed(2)}
    </div>

    ${
      recibo.estado === 'ANULADO'
        ? `
        <div class="seccion" style="background: #fef2f2; border: 1px solid #f87171; padding: 12px; border-radius: 6px;">
          <p class="campo" style="color: #991b1b;">
            <strong>Motivo anulación:</strong>
            ${escaparHtml(recibo.motivo_anulacion)}
          </p>

          <p class="campo" style="color: #991b1b;">
            <strong>Fecha anulación:</strong>
            ${escaparHtml(formatearFecha(recibo.fecha_anulacion || recibo.anulado_at))}
          </p>
        </div>
      `
        : ''
    }

    <div class="nota">
      Documento interno de Dulce Bocado - No válido para crédito fiscal.
    </div>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>
  `
}

export default function ReciboDetalleModal({
  abierto,
  reciboId,
  onCerrar,
  onActualizado,
}) {
  const [recibo, setRecibo] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const [error, setError] = useState('')
  const [mostrarAnulacion, setMostrarAnulacion] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const cargarRecibo = useCallback(async () => {
    if (!reciboId) return
    try {
      setCargando(true)
      setError('')
      setMostrarAnulacion(false)
      setMotivoAnulacion('')

      const respuesta = await obtenerRecibo(reciboId)
      setRecibo(respuesta.recibo)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el recibo.')
    } finally {
      setCargando(false)
    }
  }, [reciboId])

  useEffect(() => {
    if (abierto && reciboId) {
      cargarRecibo()
    }
  }, [abierto, reciboId, cargarRecibo])

  async function manejarImpresion() {
    if (!recibo) return

    const ventanaImpresion = window.open('', '_blank', 'width=900,height=750')

    if (!ventanaImpresion) {
      setError(
        'El navegador bloqueó la ventana de impresión. Habilite las ventanas emergentes para este sitio.'
      )
      return
    }

    try {
      setProcesando(true)
      setError('')

      ventanaImpresion.document.write(
        '<p style="font-family:Arial;padding:20px;">Preparando recibo para impresión...</p>'
      )

      const respuesta = await registrarImpresionRecibo(recibo.id_recibo)
      const reciboActualizado = respuesta.recibo

      setRecibo(reciboActualizado)
      onActualizado?.()

      ventanaImpresion.document.open()
      ventanaImpresion.document.write(construirHtmlImpresion(reciboActualizado))
      ventanaImpresion.document.close()
    } catch (err) {
      ventanaImpresion.close()
      setError(err.message || 'No se pudo registrar la impresión.')
    } finally {
      setProcesando(false)
    }
  }

  async function manejarDescargaPdf() {
    if (!recibo) return

    try {
      setDescargandoPdf(true)
      setError('')

      const nombreArchivo = `recibo-${numeroRecibo(recibo)}.pdf`
      await descargarPdfRecibo(recibo.id_recibo, nombreArchivo)
    } catch (err) {
      setError(err.message || 'No se pudo descargar el documento PDF.')
    } finally {
      setDescargandoPdf(false)
    }
  }

  async function manejarAnulacion(event) {
    event.preventDefault()

    const motivo = motivoAnulacion.trim()

    if (motivo.length < 5) {
      setError('El motivo de anulación debe tener al menos 5 caracteres.')
      return
    }

    try {
      setProcesando(true)
      setError('')

      const respuesta = await anularRecibo(recibo.id_recibo, {
        motivo_anulacion: motivo,
      })

      setRecibo(respuesta.recibo)
      setMostrarAnulacion(false)
      setMotivoAnulacion('')
      onActualizado?.()
    } catch (err) {
      setError(err.message || 'No se pudo anular el recibo.')
    } finally {
      setProcesando(false)
    }
  }

  if (!abierto) {
    return null
  }

  const detalles = recibo ? obtenerDetallesRecibo(recibo) : []
  const operacionTipo = recibo?.snapshot?.origen_tipo || (recibo?.pago?.id_venta ? 'Venta' : 'Pedido')
  const operacionId = recibo?.snapshot?.origen_id || (recibo?.pago?.id_venta ?? recibo?.pago?.id_pedido ?? '-')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {recibo ? numeroRecibo(recibo) : 'Recibo'}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Recibo interno de control de pago
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando || descargandoPdf}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Cargando recibo...
            </div>
          ) : recibo ? (
            <>
              <div className="relative overflow-hidden rounded-xl border border-gray-200 p-6 dark:border-gray-700">
                {recibo.estado === 'ANULADO' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="-rotate-12 text-7xl font-black tracking-widest text-red-500/15">
                      ANULADO
                    </span>
                  </div>
                )}

                <div className="relative">
                  <div className="flex flex-wrap justify-between gap-5 border-b border-gray-200 pb-5 dark:border-gray-700">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dulce Bocado
                      </h3>

                      <p className="text-gray-500 dark:text-gray-400">
                        Recibo interno de pago
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {numeroRecibo(recibo)}
                      </p>

                      <Estado estado={recibo.estado} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Dato
                      etiqueta="Cliente"
                      valor={recibo.nombre_cliente}
                    />

                    <Dato
                      etiqueta="CI / NIT"
                      valor={recibo.ci_nit_cliente || 'No registrado'}
                    />

                    <Dato
                      etiqueta="Operación Origen"
                      valor={`${operacionTipo} #${operacionId}`}
                    />

                    <Dato
                      etiqueta="Pago"
                      valor={`#${recibo.id_pago || recibo.pago_id}`}
                    />

                    <Dato
                      etiqueta="Método de pago"
                      valor={recibo.metodo_pago}
                    />

                    <Dato
                      etiqueta="Referencia / Operación ID"
                      valor={recibo.snapshot?.operacion_id || recibo.pago?.operacion_id || 'Sin referencia'}
                    />

                    <Dato
                      etiqueta="Fecha de pago"
                      valor={formatearFecha(recibo.fecha_pago || recibo.pago?.confirmado_at)}
                    />

                    <Dato
                      etiqueta="Fecha de emisión"
                      valor={formatearFecha(recibo.fecha_emision || recibo.emitido_at)}
                    />
                  </div>

                  {detalles.length > 0 && (
                    <div className="mt-6 overflow-x-auto">
                      <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                        Detalle de productos
                      </h4>

                      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                        <thead>
                          <tr className="text-left text-gray-500 dark:text-gray-400">
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2">Presentación</th>
                            <th className="px-3 py-2 text-center">Cant.</th>
                            <th className="px-3 py-2 text-right">Precio</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {detalles.map((detalle, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                {detalle.producto}
                              </td>

                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                {detalle.presentacion}
                              </td>

                              <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">
                                {detalle.cantidad}
                              </td>

                              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                                Bs {Number(detalle.precio_unitario).toFixed(2)}
                              </td>

                              <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                Bs {Number(detalle.subtotal).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {String(
                      recibo.snapshot?.origen_tipo ??
                        '',
                    ).toUpperCase() === 'PEDIDO' &&
                      Array.isArray(
                        recibo.snapshot?.pagos_origen,
                      ) &&
                      recibo.snapshot.pagos_origen.length > 0 && (
                        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              Historial de pagos del pedido
                            </h3>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Pagos confirmados acumulados para completar el pedido.
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                              <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400">
                                  <th className="px-3 py-2">
                                    Pago
                                  </th>

                                  <th className="px-3 py-2">
                                    Medio
                                  </th>

                                  <th className="px-3 py-2">
                                    Fecha
                                  </th>

                                  <th className="px-3 py-2 text-right">
                                    Monto
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recibo.snapshot.pagos_origen.map(
                                  (pago) => (
                                    <tr key={pago.id_pago}>
                                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                                        #{pago.id_pago}
                                      </td>

                                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                        {pago.medio ?? '-'}
                                      </td>

                                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                        {formatearFecha(
                                          pago.fecha_pago,
                                        )}
                                      </td>

                                      <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                                        Bs{' '}
                                        {Number(
                                          pago.monto ?? 0,
                                        ).toFixed(2)}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    <div className="mt-6 rounded-xl bg-gray-900 p-5 text-right text-white dark:bg-gray-950">
                      <p className="text-sm text-gray-300">
                        {String(
                          recibo.snapshot?.origen_tipo ??
                            '',
                        ).toUpperCase() === 'PEDIDO' &&
                        Array.isArray(
                          recibo.snapshot?.pagos_origen,
                        ) &&
                        recibo.snapshot.pagos_origen.length > 0
                          ? 'Total pagado'
                          : 'Monto recibido'}
                      </p>

                      <p className="text-3xl font-bold">
                        Bs{' '}
                        {Number(
                          String(
                            recibo.snapshot?.origen_tipo ??
                              '',
                          ).toUpperCase() === 'PEDIDO' &&
                          Array.isArray(
                            recibo.snapshot?.pagos_origen,
                          ) &&
                          recibo.snapshot.pagos_origen.length > 0
                            ? recibo.snapshot
                                ?.total_pagado_acumulado ??
                              recibo.monto
                            : recibo.monto,
                        ).toFixed(2)}
                      </p>

                      {String(
                        recibo.snapshot?.origen_tipo ??
                          '',
                      ).toUpperCase() === 'PEDIDO' &&
                        Array.isArray(
                          recibo.snapshot?.pagos_origen,
                        ) &&
                        recibo.snapshot.pagos_origen.length > 1 && (
                          <p className="mt-2 text-xs text-gray-400">
                            Último pago: Bs{' '}
                            {Number(
                              recibo.monto ?? 0,
                            ).toFixed(2)}
                          </p>
                        )}
                    </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Dato
                      etiqueta="Emitido por usuario"
                      valor={recibo.emitido_por_usuario_id ? `#${recibo.emitido_por_usuario_id}` : (recibo.usuario_emision?.nombre ?? '-')}
                    />

                    <Dato
                      etiqueta="Cantidad de impresiones"
                      valor={recibo.cantidad_impresiones ?? 0}
                    />

                    {recibo.snapshot?.fecha_ultima_impresion && (
                      <Dato
                        etiqueta="Última impresión"
                        valor={formatearFecha(recibo.snapshot.fecha_ultima_impresion)}
                      />
                    )}
                  </div>

                  {recibo.estado === 'ANULADO' && (
                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                      <h4 className="font-semibold text-red-800 dark:text-red-300">
                        Recibo anulado
                      </h4>

                      <p className="mt-2 text-sm text-red-700 dark:text-red-200">
                        <strong>Motivo:</strong> {recibo.motivo_anulacion}
                      </p>

                      <p className="mt-1 text-sm text-red-700 dark:text-red-200">
                        <strong>Fecha de anulación:</strong>{' '}
                        {formatearFecha(recibo.fecha_anulacion || recibo.anulado_at)}
                      </p>
                    </div>
                  )}

                  <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    Documento interno de Dulce Bocado. Este recibo no constituye una factura fiscal.
                  </p>
                </div>
              </div>

              {mostrarAnulacion && recibo.estado === 'EMITIDO' && (
                <form
                  onSubmit={manejarAnulacion}
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
                >
                  <label className="block text-sm font-medium text-red-800 dark:text-red-300">
                    Motivo de anulación (mínimo 5 caracteres)
                  </label>

                  <textarea
                    value={motivoAnulacion}
                    onChange={(event) => setMotivoAnulacion(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-gray-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-gray-900 dark:text-white"
                    placeholder="Indique detalladamente el motivo de la anulación..."
                  />

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarAnulacion(false)
                        setMotivoAnulacion('')
                      }}
                      disabled={procesando}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={procesando || motivoAnulacion.trim().length < 5}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {procesando ? 'Anulando...' : 'Confirmar anulación'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={manejarDescargaPdf}
                  disabled={procesando || descargandoPdf}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {descargandoPdf ? 'Descargando PDF...' : 'Descargar PDF'}
                </button>

                <button
                  type="button"
                  onClick={manejarImpresion}
                  disabled={procesando || descargandoPdf}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  {procesando
                    ? 'Procesando...'
                    : (recibo.cantidad_impresiones ?? 0) > 0
                      ? `Reimprimir (${recibo.cantidad_impresiones})`
                      : 'Imprimir'}
                </button>

                {recibo.estado === 'EMITIDO' && !mostrarAnulacion && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setMostrarAnulacion(true)
                    }}
                    disabled={procesando || descargandoPdf}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Anular recibo
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No se encontró el recibo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {etiqueta}
      </p>

      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </div>
  )
}

function Estado({ estado }) {
  const clases =
    estado === 'EMITIDO'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'

  return (
    <span
      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${clases}`}
    >
      {estado}
    </span>
  )
}

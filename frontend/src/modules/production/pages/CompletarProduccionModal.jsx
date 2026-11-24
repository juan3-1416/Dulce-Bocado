import { useEffect, useMemo, useState } from 'react'

function CompletarProduccionModal({
  isOpen,
  produccion,
  onClose,
  onConfirm,
  onCancel,
  modo = 'completar',
}) {
  const [unidadesProducidas, setUnidadesProducidas] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const esCancelacion = modo === 'cancelar'

  const cantidadEsperada = useMemo(() => {
    const detalle = Array.isArray(produccion?.detalles) ? produccion.detalles[0] : null

    return Number(detalle?.cantidad_esperada ?? 0)
  }, [produccion])

  useEffect(() => {
    if (!isOpen || !produccion) {
      return
    }

    setError('')
    setObservaciones('')

    if (esCancelacion) {
      setUnidadesProducidas('')
      return
    }

    setUnidadesProducidas(String(cantidadEsperada || ''))
  }, [cantidadEsperada, esCancelacion, isOpen, produccion])

  if (!isOpen || !produccion) {
    return null
  }

  const manejarSubmit = async (evento) => {
    evento.preventDefault()

    setError('')

    if (esCancelacion) {
      try {
        setGuardando(true)

        await onCancel(produccion.id_produccion, {
          observaciones: observaciones.trim() || undefined,
        })

        onClose()
      } catch (err) {
        setError(err.message || 'No se pudo cancelar la producción.')
      } finally {
        setGuardando(false)
      }

      return
    }

    const numero = Number(unidadesProducidas)

    if (!Number.isInteger(numero) || numero < 1) {
      setError('La cantidad producida debe ser un número entero mayor a 0.')
      return
    }

    if (numero > cantidadEsperada) {
      setError(`La cantidad producida no puede superar la cantidad esperada (${cantidadEsperada}).`)
      return
    }

    try {
      setGuardando(true)

      await onConfirm(produccion.id_produccion, {
        estado: 'COMPLETADA',
        unidades_producidas: numero,
        observaciones: observaciones.trim() || undefined,
      })

      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo completar la producción.')
    } finally {
      setGuardando(false)
    }
  }

  const titulo = esCancelacion
    ? `Cancelar orden #${produccion.id_produccion}`
    : `Completar orden #${produccion.id_produccion}`

  const textoBoton = esCancelacion
    ? guardando ? 'Cancelando...' : 'Confirmar cancelación'
    : guardando ? 'Completando...' : 'Confirmar'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Producción
            </p>
            <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            disabled={guardando}
          >
            ✕
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!esCancelacion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unidades producidas
              </label>
              <input
                type="number"
                min="1"
                max={cantidadEsperada}
                value={unidadesProducidas}
                onChange={(evento) => setUnidadesProducidas(evento.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Máximo permitido: {cantidadEsperada} unidades.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {esCancelacion ? 'Motivo de cancelación' : 'Observaciones'}
            </label>
            <textarea
              rows="4"
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
              placeholder={
                esCancelacion
                  ? 'Indica el motivo de la cancelación...'
                  : 'Descripción opcional del cierre de la producción...'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className={
                esCancelacion
                  ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                  : 'rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
              }
            >
              {textoBoton}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CompletarProduccionModal

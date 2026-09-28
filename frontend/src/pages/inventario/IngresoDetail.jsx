import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { obtenerIngreso } from '../../services/ingresoService'

export default function IngresoDetail() {
  const { id } = useParams()

  const [ingreso, setIngreso] =
    useState(null)

  const [cargando, setCargando] =
    useState(true)

  const [error, setError] =
    useState(null)

  useEffect(() => {
    cargarDetalle()
  }, [id])

  const cargarDetalle = async () => {
    try {
      setCargando(true)
      setError(null)

      const data =
        await obtenerIngreso(id)

      setIngreso(data)
    } catch (err) {
      setError(
        err.message ||
          'Error al cargar el detalle del ingreso.'
      )
    } finally {
      setCargando(false)
    }
  }

  const formatearNumero = (
    valor,
    decimales = 2
  ) => {
    const numero =
      Number(valor)

    if (
      !Number.isFinite(numero)
    ) {
      return '-'
    }

    return numero.toLocaleString(
      'es-BO',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits:
          decimales,
      }
    )
  }

  const formatearMoneda = (
    valor,
    decimales = 2
  ) => {
    const numero =
      Number(valor)

    if (
      !Number.isFinite(numero)
    ) {
      return '-'
    }

    return `Bs ${numero.toLocaleString(
      'es-BO',
      {
        minimumFractionDigits:
          decimales,
        maximumFractionDigits:
          decimales,
      }
    )}`
  }

  const renderItemNombre = (
    detalle
  ) => {
    if (
      detalle.producto_presentacion
    ) {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {
              detalle
                .producto_presentacion
                .producto?.nombre
            }
          </div>

          <div className="text-xs text-gray-500">
            {
              detalle
                .producto_presentacion
                .nombre
            }
          </div>
        </div>
      )
    }

    if (
      detalle.materia_prima
    ) {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {
              detalle
                .materia_prima
                .nombre
            }
          </div>

          <div className="text-xs text-gray-500">
            Unidad:{' '}
            {
              detalle
                .materia_prima
                .unidad_medida
            }
          </div>
        </div>
      )
    }

    return 'Desconocido'
  }

  const costoTotalMateriasPrimas =
    useMemo(() => {
      if (
        !Array.isArray(
          ingreso?.detalles
        )
      ) {
        return 0
      }

      return ingreso.detalles.reduce(
        (
          total,
          detalle
        ) => {
          if (
            !detalle
              .id_materia_prima
          ) {
            return total
          }

          return (
            total +
            Number(
              detalle
                .costo_total ??
                0
            )
          )
        },
        0
      )
    }, [ingreso])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Detalle de Ingreso #
            {id}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Consulta los artículos,
            cantidades y costos
            registrados en el ingreso.
          </p>
        </div>

        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            to="/inventario/ingresos"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            &larr; Volver
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-pink-600" />
        </div>
      ) : ingreso ? (
        <>
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Información del Ingreso
              </h3>
            </div>

            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Fecha
                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {new Date(
                      ingreso.fecha_ingreso
                    ).toLocaleString(
                      'es-BO'
                    )}
                  </dd>
                </div>

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Usuario
                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {ingreso.usuario
                      ?.nombre ||
                      'Sin usuario'}
                  </dd>
                </div>

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Glosa / Motivo
                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {
                      ingreso.glosa
                    }
                  </dd>
                </div>

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Costo total de materias primas
                  </dt>

                  <dd className="mt-1 text-sm font-semibold text-gray-900 sm:col-span-2 sm:mt-0">
                    {formatearMoneda(
                      costoTotalMateriasPrimas
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Ítems Ingresados
              </h3>
            </div>

            <div className="overflow-x-auto border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Almacén Destino
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Ítem
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Tipo
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      Cantidad
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      Precio unitario
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6"
                    >
                      Precio total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {ingreso.detalles.map(
                    (
                      detalle
                    ) => {
                      const esMateriaPrima =
                        Boolean(
                          detalle
                            .id_materia_prima
                        )

                      const unidad =
                        esMateriaPrima
                          ? detalle
                              .materia_prima
                              ?.unidad_medida ||
                            ''
                          : 'u.'

                      return (
                        <tr
                          key={
                            detalle.id_detalle_ingreso
                          }
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {detalle
                              .almacen
                              ?.nombre ||
                              '-'}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {renderItemNombre(
                              detalle
                            )}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {esMateriaPrima ? (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                Materia Prima
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                Producto
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatearNumero(
                              detalle.cantidad,
                              2
                            )}

                            <span className="ml-1 font-normal text-gray-500">
                              {
                                unidad
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-700">
                            {esMateriaPrima &&
                            detalle.precio_unitario !==
                              null
                              ? `${formatearMoneda(
                                  detalle.precio_unitario,
                                  4
                                )} / ${unidad}`
                              : '-'}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                            {esMateriaPrima &&
                            detalle.costo_total !==
                              null
                              ? formatearMoneda(
                                  detalle.costo_total
                                )
                              : '-'}
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>

                {costoTotalMateriasPrimas >
                  0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan="5"
                        className="px-3 py-4 text-right text-sm font-semibold text-gray-700"
                      >
                        Total materias primas:
                      </td>

                      <td className="px-3 py-4 text-right text-sm font-bold text-gray-900 sm:pr-6">
                        {formatearMoneda(
                          costoTotalMateriasPrimas
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
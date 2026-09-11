function PresentacionesTabla({
    cargando,
    presentaciones,
    productoId,
    obtenerPrecio,
    permitePersonalizacion,
    cambiarEstado,
    iniciarEdicion,
    desvincular
}) {
    if (cargando) {
        return (
            <div className="py-8 text-center text-sm text-gray-500">
                Cargando presentaciones...
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                            Presentación
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                            Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                            Precio (Bs)
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                            Personalizable
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">
                            Estado Catálogo
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                            Acciones
                        </th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                    {presentaciones.map((pres) => (
                        <tr
                            key={pres.id_presentacion}
                            className="hover:bg-gray-50"
                        >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {pres.nombre}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-500">
                                {pres.descripcion || '—'}
                            </td>

                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                Bs {obtenerPrecio(pres, productoId).toFixed(2)}
                            </td>

                            {/* Personalización */}
                            <td className="px-4 py-3 text-center">
                                {permitePersonalizacion(pres, productoId) ? (
                                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                        Sí
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                        No
                                    </span>
                                )}
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-3 text-center text-sm">
                                <button
                                    type="button"
                                    onClick={() => cambiarEstado(pres)}
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                                        pres.estado
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    title="Clic para cambiar estado en el catálogo"
                                >
                                    {pres.estado ? 'Activa' : 'Inactiva'}
                                </button>
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-3 text-right text-sm">
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => iniciarEdicion(pres)}
                                        className="font-medium text-pink-600 hover:text-pink-900"
                                    >
                                        Modificar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => desvincular(pres)}
                                        className="font-medium text-red-600 hover:text-red-900"
                                    >
                                        Desvincular
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                    {presentaciones.length === 0 && (
                        <tr>
                            <td
                                colSpan="6"
                                className="px-4 py-8 text-center text-sm text-gray-500"
                            >
                                Este producto aún no tiene ninguna presentación asignada. Elige una del catálogo o crea una nueva arriba.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default PresentacionesTabla;

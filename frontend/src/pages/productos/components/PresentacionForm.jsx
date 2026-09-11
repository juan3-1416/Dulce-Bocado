function PresentacionForm({
    editandoId,
    modo,
    setModo,
    formulario,
    setFormulario,
    manejarCambio,
    manejarGuardado,
    cancelarEdicion,
    guardando,
    presentacionesDisponiblesParaVincular,
    formularioVacio,
    setError,
    setMensaje
}) {
    return (
        <form
            onSubmit={manejarGuardado}
            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5"
        >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                    {editandoId
                        ? `Editar configuración de: ${formulario.nombre}`
                        : 'Añadir Presentación al Producto'}
                </h3>

                {!editandoId && (
                    <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => {
                                setModo('vincular');
                                setFormulario(formularioVacio());
                                setError('');
                                setMensaje('');
                            }}
                            className={`rounded-md px-3 py-1.5 transition ${
                                modo === 'vincular'
                                    ? 'bg-pink-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Elegir del Catálogo
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setModo('nueva');
                                setFormulario(formularioVacio());
                                setError('');
                                setMensaje('');
                            }}
                            className={`rounded-md px-3 py-1.5 transition ${
                                modo === 'nueva'
                                    ? 'bg-pink-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            + Crear Nueva Presentación
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Presentación */}
                {editandoId ? (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Presentación
                        </label>
                        <input
                            type="text"
                            value={formulario.nombre}
                            disabled
                            className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                        />
                    </div>
                ) : modo === 'vincular' ? (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Seleccionar Presentación
                        </label>
                        <select
                            name="id_presentacion"
                            value={formulario.id_presentacion}
                            onChange={manejarCambio}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        >
                            <option value="">
                                Seleccione una presentación...
                            </option>
                            {presentacionesDisponiblesParaVincular.map((p) => (
                                <option
                                    key={p.id_presentacion}
                                    value={p.id_presentacion}
                                >
                                    {p.nombre}
                                    {p.descripcion ? ` (${p.descripcion})` : ''}
                                </option>
                            ))}
                        </select>

                        {presentacionesDisponiblesParaVincular.length === 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                                No hay otras presentaciones disponibles en el catálogo.{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModo('nueva');
                                        setFormulario(formularioVacio());
                                    }}
                                    className="font-medium text-pink-600 underline"
                                >
                                    Crear una nueva
                                </button>
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Nombre de Presentación
                            </label>
                            <input
                                name="nombre"
                                placeholder="Ej. Porción 150g, Caja x 6..."
                                value={formulario.nombre}
                                onChange={manejarCambio}
                                required
                                maxLength={150}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Descripción (opcional)
                            </label>
                            <input
                                name="descripcion"
                                placeholder="Detalle o gramaje..."
                                value={formulario.descripcion}
                                onChange={manejarCambio}
                                maxLength={255}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                            />
                        </div>
                    </>
                )}

                {/* Precio */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Precio para este Producto (Bs)
                    </label>
                    <input
                        name="precio"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Ej. 150.00"
                        value={formulario.precio}
                        onChange={manejarCambio}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                    />
                </div>

                {/* Permite personalización */}
                <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3">
                        <input
                            type="checkbox"
                            name="permite_personalizacion"
                            checked={formulario.permite_personalizacion}
                            onChange={manejarCambio}
                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-700">
                                Permite personalización
                            </p>
                            <p className="text-xs text-gray-500">
                                Permite agregar decoración, mensaje u otro detalle con costo adicional.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Botones */}
            <div className="mt-4 flex justify-end gap-2">
                {editandoId && (
                    <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                )}

                <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                >
                    {guardando
                        ? 'Procesando...'
                        : editandoId
                        ? 'Actualizar Configuración'
                        : modo === 'vincular'
                        ? 'Vincular Presentación'
                        : 'Crear y Vincular'}
                </button>
            </div>
        </form>
    );
}

export default PresentacionForm;

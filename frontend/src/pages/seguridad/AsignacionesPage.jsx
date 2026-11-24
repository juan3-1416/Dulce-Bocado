import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  asignarRolAUsuario,
  listarUsuarioRolPermisos,
  obtenerCatalogosUsuarioRolPermiso,
  quitarRolAUsuario,
} from '../../services/usuarioRolPermisoService';
import { crearRol } from '../../services/rolService';

import './seguridad.css';

const formularioRolInicial = {
  nombre: '',
  descripcion: '',
};

function AsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [revocandoClave, setRevocandoClave] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Crear rol
  const [modalRolAbierto, setModalRolAbierto] = useState(false);
  const [formularioRol, setFormularioRol] = useState(formularioRolInicial);
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [errorRol, setErrorRol] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const [respuestaAsignaciones, respuestaCatalogos] = await Promise.all([
        listarUsuarioRolPermisos(),
        obtenerCatalogosUsuarioRolPermiso(),
      ]);
      setAsignaciones(respuestaAsignaciones.asignaciones ?? []);
      setUsuarios(respuestaCatalogos.usuarios ?? []);
      setRoles(respuestaCatalogos.roles ?? []);
    } catch (errorPeticion) {
      if (errorPeticion.status === 403) {
        setError('No tienes permiso para gestionar las asignaciones.');
      } else if (errorPeticion.status === 401) {
        setError('Tu sesión ha expirado. Inicia sesión nuevamente.');
      } else {
        setError(errorPeticion.message || 'No se pudieron cargar las asignaciones.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Agrupar las asignaciones reales de usuario_rol_permiso por Usuario + Rol.
  const rolesAsignados = useMemo(() => {
    const mapa = new Map();
    asignaciones.forEach((asignacion) => {
      const usuario = asignacion.usuario;
      const rol = asignacion.rol_permiso.rol;
      const permiso = asignacion.rol_permiso.permiso;
      const clave = `${usuario.id_usuario}-${rol.id_rol}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          usuario,
          rol,
          permisos: [],
        });
      }
      mapa.get(clave).permisos.push(permiso);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const usuarioComparacion = a.usuario.nombre.localeCompare(b.usuario.nombre);
      if (usuarioComparacion !== 0) return usuarioComparacion;
      return a.rol.nombre.localeCompare(b.rol.nombre);
    });
  }, [asignaciones]);

  const rolesAsignadosFiltrados = useMemo(() => {
    return rolesAsignados.filter((grupo) => {
      const coincideUsuario = !filtroUsuario || Number(grupo.usuario.id_usuario) === Number(filtroUsuario);
      const coincideRol = !filtroRol || Number(grupo.rol.id_rol) === Number(filtroRol);
      return coincideUsuario && coincideRol;
    });
  }, [rolesAsignados, filtroUsuario, filtroRol]);

  const obtenerMensajeError = (errorPeticion, mensajeDefecto) => {
    const errores = errorPeticion.data?.errors;
    if (errores) {
      const primerError = Object.values(errores)[0];
      if (Array.isArray(primerError)) return primerError[0];
    }
    return errorPeticion.message || mensajeDefecto;
  };

  const manejarAsignarRol = async (event) => {
    event.preventDefault();
    if (!usuarioSeleccionado || !rolSeleccionado) {
      setError('Selecciona un usuario y un rol.');
      return;
    }

    try {
      setAsignando(true);
      setError('');
      setMensaje('');

      const respuesta = await asignarRolAUsuario(usuarioSeleccionado, rolSeleccionado);
      const nuevos = respuesta.nuevos_permisos_asignados ?? 0;
      const total = respuesta.total_permisos_rol ?? 0;

      if (nuevos === 0) {
        setMensaje('El usuario ya tenía asignado este rol con sus permisos actuales.');
      } else {
        setMensaje(`Rol asignado correctamente. Se habilitaron ${nuevos} de ${total} permiso(s).`);
      }

      setRolSeleccionado('');
      await cargarDatos();
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, 'No se pudo asignar el rol al usuario.'));
    } finally {
      setAsignando(false);
    }
  };

  const manejarQuitarRol = async (grupo) => {
    const confirmado = window.confirm(
      `¿Deseas quitar el rol "${grupo.rol.nombre}" al usuario "${grupo.usuario.nombre}"?`
    );
    if (!confirmado) return;

    try {
      setRevocandoClave(grupo.clave);
      setError('');
      setMensaje('');

      const respuesta = await quitarRolAUsuario(grupo.usuario.id_usuario, grupo.rol.id_rol);
      setMensaje(respuesta.message || 'Rol quitado del usuario correctamente.');
      await cargarDatos();
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, 'No se pudo quitar el rol del usuario.'));
    } finally {
      setRevocandoClave(null);
    }
  };

  const abrirModalRol = () => {
    setFormularioRol(formularioRolInicial);
    setErrorRol('');
    setModalRolAbierto(true);
  };

  const cerrarModalRol = () => {
    if (guardandoRol) return;
    setModalRolAbierto(false);
    setFormularioRol(formularioRolInicial);
    setErrorRol('');
  };

  const manejarCambioRol = (event) => {
    const { name, value } = event.target;
    setFormularioRol((actual) => ({ ...actual, [name]: value }));
    setErrorRol('');
  };

  const manejarCrearRol = async (event) => {
    event.preventDefault();
    const nombre = formularioRol.nombre.trim();
    const descripcion = formularioRol.descripcion.trim();

    if (!nombre) {
      setErrorRol('Ingresa el nombre del rol.');
      return;
    }

    try {
      setGuardandoRol(true);
      setErrorRol('');
      setError('');
      setMensaje('');

      const respuesta = await crearRol({
        nombre,
        descripcion: descripcion || null,
      });

      const catalogos = await obtenerCatalogosUsuarioRolPermiso();
      const rolesActualizados = catalogos.roles ?? [];
      setUsuarios(catalogos.usuarios ?? []);
      setRoles(rolesActualizados);

      const idRolCreado = respuesta?.rol?.id_rol;
      if (idRolCreado) {
        setRolSeleccionado(String(idRolCreado));
      } else {
        const rolCreado = rolesActualizados.find(
          (rol) => rol.nombre.trim().toLowerCase() === nombre.toLowerCase()
        );
        if (rolCreado) {
          setRolSeleccionado(String(rolCreado.id_rol));
        }
      }

      setModalRolAbierto(false);
      setFormularioRol(formularioRolInicial);
      setMensaje(
        'Rol creado correctamente. Ahora configura sus permisos desde Rol-Permiso antes de asignarlo a un usuario.'
      );
    } catch (errorPeticion) {
      setErrorRol(obtenerMensajeError(errorPeticion, 'No se pudo crear el rol.'));
    } finally {
      setGuardandoRol(false);
    }
  };

  return (
    <section className="security-page min-w-0 space-y-6 pb-10 text-theme-body">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-theme-heading sm:text-3xl">Asignaciones de Roles</h1>
          <p className="mt-1 text-sm text-theme-body">
            Asigna roles a los usuarios. Los permisos de cada rol se administran desde Rol-Permiso.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={cargando}
          className="rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {mensaje && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {mensaje}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-theme-border-subtle bg-theme-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme-heading">Asignar rol a usuario</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Selecciona el usuario y el rol. El sistema habilitará automáticamente los permisos configurados para ese rol.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalRol}
            className="shrink-0 rounded-lg border border-pink-300 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
          >
            Crear nuevo rol
          </button>
        </div>

        <form onSubmit={manejarAsignarRol} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="usuario_asignacion" className="mb-1 block text-sm font-medium text-theme-body">
              Usuario
            </label>
            <select
              id="usuario_asignacion"
              value={usuarioSeleccionado}
              onChange={(event) => {
                setUsuarioSeleccionado(event.target.value);
                setError('');
                setMensaje('');
              }}
              required
              className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
            >
              <option value="">Seleccionar usuario</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id_usuario} value={usuario.id_usuario}>
                  {usuario.nombre} (@{usuario.nombre_usuario})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="rol_asignacion" className="block text-sm font-medium text-theme-body">
                Rol
              </label>
              <span className="text-xs text-theme-muted">Permisos definidos en Rol-Permiso</span>
            </div>
            <select
              id="rol_asignacion"
              value={rolSeleccionado}
              onChange={(event) => {
                setRolSeleccionado(event.target.value);
                setError('');
                setMensaje('');
              }}
              required
              className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
            >
              <option value="">Seleccionar rol</option>
              {roles.map((rol) => (
                <option key={rol.id_rol} value={rol.id_rol}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end sm:col-span-2 xl:col-span-1">
            <button
              type="submit"
              disabled={asignando || !usuarioSeleccionado || !rolSeleccionado}
              className="w-full rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {asignando ? 'Asignando...' : 'Asignar Rol'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-surface">
        <div className="border-b border-theme-border-subtle bg-theme-subtle p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-bold text-theme-heading">Roles asignados</h2>
              <p className="mt-1 text-sm text-theme-muted">
                Consulta y administra los roles actualmente asignados a los usuarios.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div>
                <label htmlFor="filtro_usuario" className="mb-1 block text-xs font-medium text-theme-body">
                  Usuario
                </label>
                <select
                  id="filtro_usuario"
                  value={filtroUsuario}
                  onChange={(event) => setFiltroUsuario(event.target.value)}
                  className="w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id_usuario} value={usuario.id_usuario}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filtro_rol" className="mb-1 block text-xs font-medium text-theme-body">
                  Rol
                </label>
                <select
                  id="filtro_rol"
                  value={filtroRol}
                  onChange={(event) => setFiltroRol(event.target.value)}
                  className="w-full rounded-lg border border-theme-border-subtle bg-theme-surface px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {roles.map((rol) => (
                    <option key={rol.id_rol} value={rol.id_rol}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {(filtroUsuario || filtroRol) && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroUsuario('');
                      setFiltroRol('');
                    }}
                    className="px-2 py-2 text-xs font-semibold text-pink-700 hover:text-pink-800"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-theme-muted">Cargando asignaciones...</div>
        ) : rolesAsignadosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-theme-muted">
            No existen roles asignados que coincidan con los filtros.
          </div>
        ) : (
          <div className="min-w-0">
            <table className="security-table divide-y divide-theme-border-subtle" aria-label="Roles asignados">
              <thead className="bg-theme-subtle">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">Permisos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-theme-body">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-subtle bg-theme-surface">
                {rolesAsignadosFiltrados.map((grupo) => (
                  <tr key={grupo.clave} className="align-top hover:bg-theme-hover">
                    <td data-label="Usuario" className="px-6 py-4">
                      <p className="text-sm font-semibold text-theme-heading">{grupo.usuario.nombre}</p>
                      <p className="mt-1 text-xs text-theme-muted">@{grupo.usuario.nombre_usuario}</p>
                    </td>
                    <td data-label="Rol" className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                        {grupo.rol.nombre}
                      </span>
                    </td>
                    <td data-label="Permisos" className="px-6 py-4">
                      <p className="text-sm font-semibold text-theme-heading">
                        {grupo.permisos.length} permiso(s)
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-pink-700 hover:text-pink-800">
                          Ver permisos
                        </summary>
                        <div className="mt-2 space-y-1 rounded-lg bg-theme-subtle p-3">
                          {grupo.permisos.map((permiso) => (
                            <p key={permiso.id_permiso} className="text-xs text-theme-body">
                              • {permiso.nombre}
                            </p>
                          ))}
                        </div>
                      </details>
                    </td>
                    <td data-label="Estado" className="px-6 py-4">
                      {grupo.usuario.activo && grupo.rol.activo ? (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td data-label="Acción" className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => manejarQuitarRol(grupo)}
                        disabled={revocandoClave === grupo.clave}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {revocandoClave === grupo.clave ? 'Quitando...' : 'Quitar Rol'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalRolAbierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="crear-rol-titulo" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-theme-surface shadow-xl">
            <div className="border-b border-theme-border-subtle px-6 py-4">
              <h2 id="crear-rol-titulo" className="text-xl font-semibold text-theme-heading">Crear nuevo rol</h2>
              <p className="mt-1 text-sm text-theme-muted">
                Crea un nuevo tipo de acceso para los usuarios del sistema.
              </p>
            </div>

            <form onSubmit={manejarCrearRol} className="space-y-5 p-6">
              {errorRol && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {errorRol}
                </div>
              )}

              <div>
                <label htmlFor="nombre_rol" className="mb-1 block text-sm font-medium text-theme-body">
                  Nombre del rol
                </label>
                <input
                  id="nombre_rol"
                  name="nombre"
                  type="text"
                  value={formularioRol.nombre}
                  onChange={manejarCambioRol}
                  maxLength={60}
                  required
                  placeholder="Ej. Supervisor"
                  className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                />
              </div>

              <div>
                <label htmlFor="descripcion_rol" className="mb-1 block text-sm font-medium text-theme-body">
                  Descripción
                </label>
                <textarea
                  id="descripcion_rol"
                  name="descripcion"
                  value={formularioRol.descripcion}
                  onChange={manejarCambioRol}
                  rows={4}
                  maxLength={255}
                  placeholder="Describe brevemente la función de este rol..."
                  className="w-full rounded-lg border border-theme-border-subtle px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                />
                <p className="mt-1 text-xs text-theme-muted">
                  La configuración de permisos se realiza posteriormente desde Rol-Permiso.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-theme-border-subtle pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalRol}
                  disabled={guardandoRol}
                  className="rounded-lg border border-theme-border-subtle px-4 py-2 text-sm font-semibold text-theme-body hover:bg-theme-hover disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoRol || !formularioRol.nombre.trim()}
                  className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoRol ? 'Creando...' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AsignacionesPage;

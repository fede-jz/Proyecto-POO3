import React from 'react';

const ELEMENTOS_POR_PAGINA_ROLES = 10;

export const MenuRoles = ({
  miembros,
  cargandoMiembros, // 👈 1. Recibimos la prop de carga
  miembrosSeleccionados,
  setMiembrosSeleccionados,
  usuario, 
  mostrarModalNuevoMiembro,
  setMostrarModalNuevoMiembro,
  nuevoNombre,
  setNuevoNombre,
  nuevoEmail,
  setNuevoEmail,
  nuevoRol,
  setNuevoRol,
  handleCrearMiembro,
  handleCambiarRolMiembro,
  handleCambiarRolMasivo,
  handleEliminarMiembro,
  handleEliminarSeleccionados,
  handleToggleSelectAll,
  handleToggleRowMember,
  paginaActualRoles,
  setPaginaActualRoles,
  mostrarMensajeDescarga
}) => {
  // 1. Evaluamos si es Administrador según el rol real de la BBDD
  const esAdmin = usuario?.rol === 'Administrador';

  // 2. Paginación
  const totalMiembros = miembros.length;
  const totalPaginasRoles = Math.max(1, Math.ceil(totalMiembros / ELEMENTOS_POR_PAGINA_ROLES));
  const paginaValidaRoles = Math.min(Math.max(1, paginaActualRoles), totalPaginasRoles);

  const indiceInicioRoles = (paginaValidaRoles - 1) * ELEMENTOS_POR_PAGINA_ROLES;
  const indiceFinRoles = Math.min(indiceInicioRoles + ELEMENTOS_POR_PAGINA_ROLES, totalMiembros);
  const miembrosPaginados = miembros.slice(indiceInicioRoles, indiceFinRoles);

  const rangoTextoRoles =
    totalMiembros === 0
      ? '0 de 0 miembros'
      : `${indiceInicioRoles + 1}–${indiceFinRoles} de ${totalMiembros} miembros`;

  const todosSeleccionados =
    miembrosPaginados.length > 0 &&
    miembrosPaginados.every((m) => miembrosSeleccionados.includes(m.id));
  const algunosSeleccionados =
    miembrosPaginados.some((m) => miembrosSeleccionados.includes(m.id)) && !todosSeleccionados;

  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'Administrador':
        return <span className="badge-rol rol-admin">Administrador</span>;
      case 'Operador de Guardia':
        return <span className="badge-rol rol-operador">Operador de Guardia</span>;
      case 'Visualizador':
      default:
        return <span className="badge-rol rol-visualizador">Visualizador</span>;
    }
  };

  return (
    <div className="modulo-roles-miembros">
      {/* Targeta con datos del Operador en Sesión Real */}
      <div className="card-operador-activo">
        <div className="operador-activo-left">
          <div className="avatar-mini-operador">
            {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="operador-textos">
            <span className="operador-sub">Operador en sesión:</span>
            <strong>{usuario?.nombre || 'Invitado'}</strong>
          </div>
        </div>

        <div className="operador-rol-toggle">
          <span className="label-simulacion">Rol asignado:</span>
          <span className="badge-rol-admin" style={{ padding: '0.35rem 0.8rem', borderRadius: '4px', background: '#0284c7', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
            {usuario?.rol || 'Visualizador'}
          </span>
        </div>
      </div>

      {/* Banner Informativo y Botones de Acción (Condicionados a esAdmin) */}
      {!esAdmin ? (
        <div className="banner-permiso-solo-lectura">
          <span className="icono-candado">🔒</span>
          <div>
            <strong>Modo Solo Lectura</strong>
            <p>
              Has iniciado sesión con el rol <em>{usuario?.rol || 'Visualizador'}</em>. Solo las cuentas con rol{' '}
              <strong>Administrador</strong> pueden modificar roles del sistema.
            </p>
          </div>
        </div>
      ) : (
        <div className="banner-permiso-admin">
          <div className="admin-status-text">
            <span className="icono-corona">👑</span>
            <span>Modo Administrador Activo: Permisos completos de gestión y asignación de roles.</span>
          </div>
        </div>
      )}

      {/* Indicador de carga dinámico */}
      {cargandoMiembros && (
        <div style={{ padding: '0.75rem', textAlign: 'center', color: '#38bdf8', fontSize: '0.9rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', marginBottom: '1rem' }}>
          ⏳ Sincronizando miembros desde la base de datos...
        </div>
      )}

      {/* Barra de Acciones Masivas (Solo Administradores) */}
      {esAdmin && miembrosSeleccionados.length > 0 && (
        <div className="barra-acciones-miembros">
          <div className="info-sel-miembros">
            <span className="badge-sel-num">{miembrosSeleccionados.length}</span>
            <span>miembros seleccionados</span>
          </div>
          <div className="botones-sel-miembros">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleCambiarRolMasivo(e.target.value);
                  e.target.value = '';
                }
              }}
              className="select-cambio-masivo"
              defaultValue=""
            >
              <option value="" disabled>Cambiar Rol a...</option>
              <option value="Administrador">Administrador</option>
              <option value="Operador de Guardia">Operador de Guardia</option>
              <option value="Visualizador">Visualizador</option>
            </select>
            <button type="button" className="btn-limpiar-sel-miembros" onClick={() => setMiembrosSeleccionados([])}>✕</button>
          </div>
        </div>
      )}

      {/* Tabla de Miembros */}
      <div className="tabla-miembros-wrapper">
        <table className="tabla-miembros">
          <thead>
            <tr>
              {esAdmin && (
                <th className="th-check-miembro">
                  <label className="checkbox-miembro-container">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      ref={(el) => { if (el) el.indeterminate = algunosSeleccionados; }}
                      onChange={handleToggleSelectAll}
                    />
                    <span className="checkbox-miembro-box"></span>
                  </label>
                </th>
              )}
              <th>Usuario</th>
              <th>Rol</th>
              <th>Última Conexión</th>
            </tr>
          </thead>
          <tbody>
            {miembrosPaginados.length > 0 ? (
              miembrosPaginados.map((m) => {
                const estaSeleccionado = miembrosSeleccionados.includes(m.id);
                return (
                  <tr key={m.id} className={`fila-miembro ${estaSeleccionado ? 'fila-miembro-sel' : ''}`}>
                    {esAdmin && (
                      <td className="td-check-miembro" onClick={() => handleToggleRowMember(m.id)}>
                        <label className="checkbox-miembro-container" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={estaSeleccionado} onChange={() => handleToggleRowMember(m.id)} />
                          <span className="checkbox-miembro-box"></span>
                        </label>
                      </td>
                    )}
                    <td className="td-usuario-info">
                      <div className="usuario-celda">
                        <span className="avatar-iniciales">{m.avatarIniciales}</span>
                        <div className="usuario-textos-col">
                          <span className="usuario-nombre">{m.nombre}</span>
                          <span className="usuario-correo">{m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="td-rol-celda">
                      {/* Si es Admin, puede cambiar el rol directamente en el selector */}
                      {esAdmin ? (
                        <select
                          value={m.rol}
                          onChange={(e) => handleCambiarRolMiembro(m.id, e.target.value)}
                          className="select-rol-en-tabla"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Operador de Guardia">Operador de Guardia</option>
                          <option value="Visualizador">Visualizador</option>
                        </select>
                      ) : (
                        renderBadgeRol(m.rol)
                      )}
                    </td>
                    <td className="td-conexion font-mono">{m.ultimaConexion}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={esAdmin ? 4 : 3} className="sin-miembros">
                  {cargandoMiembros ? "Cargando registros..." : "No hay miembros registrados en la base de datos."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Controles de Paginación */}
        <div className="paginacion-roles-gmail">
          <div className="info-paginacion-roles">
            <span className="rango-roles font-mono">{rangoTextoRoles}</span>
            <span className="pagina-roles">(Página {paginaValidaRoles} de {totalPaginasRoles})</span>
          </div>
          <div className="controles-paginacion-roles">
            <button
              type="button"
              className="btn-pag-nav-roles"
              disabled={paginaValidaRoles <= 1}
              onClick={() => setPaginaActualRoles((prev) => Math.max(1, prev - 1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn-pag-nav-roles"
              disabled={paginaValidaRoles >= totalPaginasRoles || totalMiembros === 0}
              onClick={() => setPaginaActualRoles((prev) => Math.min(totalPaginasRoles, prev + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
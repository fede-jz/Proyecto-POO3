import React, { useState, useEffect } from 'react';
import './TablaAlertas.css';

const ELEMENTOS_POR_PAGINA = 10;

export const TablaAlertas = ({
  alertas,
  onActualizarAlerta,
  onMarcarReconocidas,
}) => {
  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Paginación estilo Gmail
  const [paginaActual, setPaginaActual] = useState(1);

  // Selección de filas
  const [seleccionados, setSeleccionados] = useState([]);

  // Drawer lateral para detalle de alerta
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [observacionTemp, setObservacionTemp] = useState('');
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  // Sincronizar observaciones cuando cambia la alerta seleccionada
  useEffect(() => {
    if (alertaSeleccionada) {
      setObservacionTemp(alertaSeleccionada.observaciones || '');
      setMensajeGuardado(false);
    }
  }, [alertaSeleccionada]);

  // Cerrar drawer con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && alertaSeleccionada) {
        setAlertaSeleccionada(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [alertaSeleccionada]);

  // Filtrado de alertas
  const alertasFiltradas = alertas.filter((a) => {
    const coincideTexto =
      a.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.procesoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.procesoId.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tipo.toLowerCase().includes(busqueda.toLowerCase());

    const coincideSeveridad =
      filtroSeveridad === 'todas' || a.severidad.toLowerCase() === filtroSeveridad.toLowerCase();

    const coincideEstado =
      filtroEstado === 'todos' || a.estadoEntrega.toLowerCase() === filtroEstado.toLowerCase();

    return coincideTexto && coincideSeveridad && coincideEstado;
  });

  // Paginación
  const totalElementos = alertasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / ELEMENTOS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);

  const indiceInicio = totalElementos === 0 ? 0 : (paginaValida - 1) * ELEMENTOS_POR_PAGINA;
  const indiceFin = Math.min(indiceInicio + ELEMENTOS_POR_PAGINA, totalElementos);
  const alertasPaginadas = alertasFiltradas.slice(indiceInicio, indiceFin);

  const rangoTexto =
    totalElementos === 0
      ? '0 de 0 alertas'
      : `${indiceInicio + 1}–${indiceFin} de ${totalElementos} alertas`;

  // Manejo de Selección
  const todasSeleccionadas =
    alertasPaginadas.length > 0 && alertasPaginadas.every((a) => seleccionados.includes(a.id));
  const algunasSeleccionadas =
    alertasPaginadas.some((a) => seleccionados.includes(a.id)) && !todasSeleccionadas;

  const handleToggleSelectAll = () => {
    if (todasSeleccionadas) {
      const idsPagina = new Set(alertasPaginadas.map((a) => a.id));
      setSeleccionados(seleccionados.filter((id) => !idsPagina.has(id)));
    } else {
      const nuevoSet = new Set([...seleccionados, ...alertasPaginadas.map((a) => a.id)]);
      setSeleccionados(Array.from(nuevoSet));
    }
  };

  const handleToggleRow = (id, e) => {
    e.stopPropagation();
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  // Guardar Observaciones
  const handleGuardarObservaciones = () => {
    if (!alertaSeleccionada) return;
    const actualizada = {
      ...alertaSeleccionada,
      observaciones: observacionTemp,
    };
    onActualizarAlerta(actualizada);
    setAlertaSeleccionada(actualizada);
    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 2500);
  };

  // Alternar Reconocimiento
  const handleAlternarReconocimiento = (alerta) => {
    const nuevoEstado =
      alerta.estadoEntrega === 'Reconocido' ? 'No reconocido' : 'Reconocido';
    const actualizada = {
      ...alerta,
      estadoEntrega: nuevoEstado,
    };
    onActualizarAlerta(actualizada);
    if (alertaSeleccionada && alertaSeleccionada.id === alerta.id) {
      setAlertaSeleccionada(actualizada);
    }
  };

  // Reconocimiento masivo
  const handleReconocerSeleccionados = () => {
    if (onMarcarReconocidas && seleccionados.length > 0) {
      onMarcarReconocidas(seleccionados);
      setSeleccionados([]);
    }
  };

  // Badge de Severidad
  const renderBadgeSeveridad = (sev) => {
    switch (sev) {
      case 'Crítico':
      case 'Alto':
        return <span className="badge-severidad sev-alto">{sev}</span>;
      case 'Medio':
        return <span className="badge-severidad sev-medio">{sev}</span>;
      case 'Bajo':
      default:
        return <span className="badge-severidad sev-bajo">{sev}</span>;
    }
  };

  // Badge de Entrega Telegram
  const renderBadgeEntrega = (estado) => {
    switch (estado) {
      case 'Reconocido':
        return (
          <span className="badge-entrega entrega-reconocido" title="Alerta atendida y reconocida">
            <span className="dot-estado">●</span> Reconocido
          </span>
        );
      case 'No reconocido':
        return (
          <span className="badge-entrega entrega-no-reconocido" title="Notificada a Telegram pero sin atención">
            <span className="dot-estado">●</span> No reconocido
          </span>
        );
      case 'No entregado':
      default:
        return (
          <span className="badge-entrega entrega-no-entregado" title="Fallo en la conexión o pendiente">
            <span className="dot-estado">●</span> No entregado
          </span>
        );
    }
  };

  return (
    <div className="alertas-modulo-container">
      {/* Cabecera y Controles */}
      <div className="alertas-header-card">
        <div className="alertas-titulo-bloque">
          <div className="icono-titulo-alertas">🔔</div>
          <div>
            <h3>Gestión de Alertas del Sistema</h3>
            <p className="subtitulo-alertas">
              Supervisión de eventos, disparadores de umbrales y registro de notificaciones a Telegram
            </p>
          </div>
        </div>

        {/* Filtros de Búsqueda y Selectores */}
        <div className="alertas-controles-filtros">
          <input
            type="text"
            placeholder="Buscar por ID, Proceso o Tipo..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            className="input-busqueda-alertas"
          />

          <select
            value={filtroSeveridad}
            onChange={(e) => {
              setFiltroSeveridad(e.target.value);
              setPaginaActual(1);
            }}
            className="select-filtro-alertas"
          >
            <option value="todas">Severidad: Todas</option>
            <option value="crítico">Crítico / Alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPaginaActual(1);
            }}
            className="select-filtro-alertas"
          >
            <option value="todos">Telegram: Todos</option>
            <option value="no reconocido">No reconocido</option>
            <option value="reconocido">Reconocido</option>
            <option value="no entregado">No entregado</option>
          </select>
        </div>
      </div>

      {/* Barra de Acciones de Selección Masiva */}
      {seleccionados.length > 0 && (
        <div className="barra-acciones-alertas">
          <div className="acciones-alertas-info">
            <span className="badge-seleccionados-num">{seleccionados.length}</span>
            <span>alertas seleccionadas</span>
          </div>

          <div className="acciones-alertas-botones">
            <button
              type="button"
              className="btn-accion-alerta primario"
              onClick={handleReconocerSeleccionados}
            >
              ✓ Marcar como Reconocidas
            </button>
            <button
              type="button"
              className="btn-accion-alerta secundario"
              onClick={() => setSeleccionados([])}
            >
              ✕ Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Contenedor Principal: Tabla + Drawer Lateral */}
      <div className={`layout-tabla-drawer ${alertaSeleccionada ? 'con-drawer-abierto' : ''}`}>
        {/* Tabla de Alta Densidad */}
        <div className="tabla-alertas-wrapper">
          <table className="tabla-alertas-alta-densidad">
            <thead>
              <tr>
                <th className="th-alerta-check">
                  <label className="checkbox-alerta-container">
                    <input
                      type="checkbox"
                      checked={todasSeleccionadas}
                      ref={(el) => {
                        if (el) el.indeterminate = algunasSeleccionadas;
                      }}
                      onChange={handleToggleSelectAll}
                    />
                    <span className="checkbox-alerta-box"></span>
                  </label>
                </th>
                <th>ID Alerta</th>
                <th>ID Proceso</th>
                <th>Tipo de Alerta</th>
                <th>Severidad</th>
                <th>Estado Entrega (Telegram)</th>
                <th>Fecha y Horario</th>
              </tr>
            </thead>
            <tbody>
              {alertasPaginadas.length > 0 ? (
                alertasPaginadas.map((alerta) => {
                  const estaSeleccionada = seleccionados.includes(alerta.id);
                  const estaActiva = alertaSeleccionada?.id === alerta.id;

                  return (
                    <tr
                      key={alerta.id}
                      onClick={() => setAlertaSeleccionada(alerta)}
                      className={`fila-alerta ${estaSeleccionada ? 'fila-sel' : ''} ${
                        estaActiva ? 'fila-activa' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="td-alerta-check" onClick={(e) => handleToggleRow(alerta.id, e)}>
                        <label className="checkbox-alerta-container" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={(e) => handleToggleRow(alerta.id, e)}
                          />
                          <span className="checkbox-alerta-box"></span>
                        </label>
                      </td>

                      {/* ID Alerta */}
                      <td className="td-alerta-id font-mono">{alerta.id}</td>

                      {/* ID Proceso */}
                      <td className="td-proceso-info">
                        <span className="proceso-id-tag font-mono">{alerta.procesoId}</span>
                      </td>

                      {/* Tipo */}
                      <td className="td-alerta-tipo">
                        <span className="tipo-texto">{alerta.tipo}</span>
                        {alerta.observaciones && (
                          <span className="indicador-nota" title="Posee observaciones técnicas registradas">
                            📝
                          </span>
                        )}
                      </td>

                      {/* Severidad */}
                      <td>{renderBadgeSeveridad(alerta.severidad)}</td>

                      {/* Estado Entrega */}
                      <td>{renderBadgeEntrega(alerta.estadoEntrega)}</td>

                      {/* Timestamp */}
                      <td className="td-alerta-fecha font-mono">{alerta.fechaHora}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="sin-alertas">
                    No se encontraron alertas que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación estilo Gmail */}
          <div className="paginacion-alertas-gmail">
            <div className="paginacion-info-alertas">
              <span className="rango-texto">{rangoTexto}</span>
              <span className="pagina-texto">
                (Página {paginaValida} de {totalPaginas})
              </span>
            </div>

            <div className="paginacion-controles-alertas">
              <button
                type="button"
                className="btn-pag-alerta"
                disabled={paginaValida <= 1}
                onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                title="Página anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className="btn-pag-alerta"
                disabled={paginaValida >= totalPaginas || totalElementos === 0}
                onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                title="Página siguiente"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Detalle de Alerta (Drawer Lateral) */}
        {alertaSeleccionada && (
          <aside className="drawer-alerta-detalle">
            {/* Header del Drawer */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <span className="drawer-badge-id font-mono">{alertaSeleccionada.id}</span>
                <h4>Detalle de Alerta</h4>
              </div>
              <button
                type="button"
                className="btn-cerrar-drawer"
                onClick={() => setAlertaSeleccionada(null)}
                title="Cerrar detalle (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="drawer-cuerpo">
              {/* Tarjeta de Resumen */}
              <div className="drawer-seccion-card">
                <div className="drawer-fila-info">
                  <span className="info-label">Tipo:</span>
                  <span className="info-valor-destacado">{alertaSeleccionada.tipo}</span>
                </div>
                <div className="drawer-fila-info">
                  <span className="info-label">Severidad:</span>
                  <span>{renderBadgeSeveridad(alertaSeleccionada.severidad)}</span>
                </div>
                <div className="drawer-fila-info">
                  <span className="info-label">Proceso:</span>
                  <span className="info-valor font-mono">{alertaSeleccionada.procesoNombre}</span>
                </div>
                <div className="drawer-fila-info">
                  <span className="info-label">ID Proceso:</span>
                  <span className="info-valor font-mono">{alertaSeleccionada.procesoId}</span>
                </div>
                {alertaSeleccionada.valorDetectado && (
                  <div className="drawer-fila-info">
                    <span className="info-label">Valor Detectado:</span>
                    <span className="info-valor-alerta font-mono">{alertaSeleccionada.valorDetectado}</span>
                  </div>
                )}
                {alertaSeleccionada.umbral && (
                  <div className="drawer-fila-info">
                    <span className="info-label">Umbral Configurado:</span>
                    <span className="info-valor font-mono">{alertaSeleccionada.umbral}</span>
                  </div>
                )}
                <div className="drawer-fila-info">
                  <span className="info-label">Fecha y Hora:</span>
                  <span className="info-valor font-mono">{alertaSeleccionada.fechaHora}</span>
                </div>
              </div>

              {/* Botón rápido de Reconocimiento */}
              <div className="drawer-acciones-rapidas">
                <button
                  type="button"
                  className={`btn-toggle-reconocimiento ${
                    alertaSeleccionada.estadoEntrega === 'Reconocido' ? 'reconocido' : ''
                  }`}
                  onClick={() => handleAlternarReconocimiento(alertaSeleccionada)}
                >
                  {alertaSeleccionada.estadoEntrega === 'Reconocido'
                    ? '✓ Alerta Reconocida (Desmarcar)'
                    : 'Marcar como Reconocida'}
                </button>
              </div>

              {/* Payload de Telegram Transmitido */}
              <div className="drawer-seccion-card">
                <div className="seccion-subtitulo">
                  <span>📱 Transmisión Telegram</span>
                  {renderBadgeEntrega(alertaSeleccionada.estadoEntrega)}
                </div>

                <div className="telegram-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Chat ID:</span>
                    <span className="meta-val font-mono">{alertaSeleccionada.mensajeTelegram.chatId}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Bot:</span>
                    <span className="meta-val font-mono">{alertaSeleccionada.mensajeTelegram.botUsuario}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Despacho:</span>
                    <span className="meta-val font-mono">{alertaSeleccionada.mensajeTelegram.enviadoEn}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Reintentos:</span>
                    <span className="meta-val font-mono">{alertaSeleccionada.mensajeTelegram.reintentos}</span>
                  </div>
                </div>

                <div className="telegram-mensaje-box">
                  <span className="box-label">Payload transmitido:</span>
                  <pre className="telegram-cuerpo font-mono">
                    {alertaSeleccionada.mensajeTelegram.cuerpo}
                  </pre>
                </div>
              </div>

              {/* Sección Editable de Observaciones */}
              <div className="drawer-seccion-card observaciones-card">
                <div className="seccion-subtitulo">
                  <span>📝 Observaciones Técnicas</span>
                  {mensajeGuardado && <span className="badge-guardado">✓ Guardado</span>}
                </div>

                <p className="observaciones-ayuda">
                  Registra diagnósticos, causas identificadas o acciones tomadas por el equipo de guardia.
                </p>

                <textarea
                  className="textarea-observaciones"
                  placeholder="Escribe tus observaciones o seguimiento de la alerta aquí..."
                  rows={4}
                  value={observacionTemp}
                  onChange={(e) => setObservacionTemp(e.target.value)}
                />

                <div className="observaciones-footer">
                  <button
                    type="button"
                    className="btn-guardar-observaciones"
                    onClick={handleGuardarObservaciones}
                  >
                    Guardar Observaciones
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

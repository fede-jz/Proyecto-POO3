import React from 'react';
import './Navbar.css';

export const Navbar = ({
  status = 'OFFLINE',
  vistaActiva,
  onCambiarVista,
  onAbrirAjustes,
  conteoAlertasNoReconocidas = 0,
}) => {
  return (
    <header className="navbar">
      {/* Marca / Logotipo */}
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => onCambiarVista('procesos')} title="Monitoreo de Procesos">
          <span className="logo-icon">🛡️</span>
          <h2>SysMonitor</h2>
        </div>

        {/* Pestañas de Navegación Principal */}
        <nav className="navbar-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${vistaActiva === 'procesos' ? 'activo' : ''}`}
            onClick={() => onCambiarVista('procesos')}
          >
            <span className="nav-tab-icon">⚡</span>
            <span>Procesos</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${vistaActiva === 'alertas' ? 'activo' : ''}`}
            onClick={() => onCambiarVista('alertas')}
          >
            <span className="nav-tab-icon">🔔</span>
            <span>Alertas</span>
            {conteoAlertasNoReconocidas > 0 && (
              <span className="badge-alertas-count" title={`${conteoAlertasNoReconocidas} alertas no reconocidas`}>
                {conteoAlertasNoReconocidas}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Controles de la derecha: Estado Servidor + Botón de Menú de Ajustes */}
      <div className="navbar-right">
        <div className="navbar-status">
          <span className={`status-indicator ${status.toLowerCase()}`}></span>
          <span className="status-text">Servidor: {status}</span>
        </div>

        {/* Botón de Menú de Ajustes / Drawer */}
        <button
          type="button"
          className="btn-menu-ajustes"
          onClick={onAbrirAjustes}
          title="Abrir menú de configuración y exportación de datos"
          aria-label="Abrir Ajustes"
        >
          <span className="icono-hamburguesa">☰</span>
        </button>
      </div>
    </header>
  );
};

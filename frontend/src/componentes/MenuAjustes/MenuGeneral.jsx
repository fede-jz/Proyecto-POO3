import React from 'react';

export const MenuGeneral = ({
  tema,
  setTema,
  noMolestar,
  setNoMolestar,
  horaInicioNoMolestar,
  setHoraInicioNoMolestar,
  horaFinNoMolestar,
  setHoraFinNoMolestar,
  idioma,
  setIdioma,
  refrescoAuto,
  setRefrescoAuto,
  notificacionesTelegram,
  setNotificacionesTelegram
}) => {
  return (
    <div className="seccion-general-container">
      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Tema de Interfaz</strong>
          <span>Por defecto en <strong>Modo Oscuro</strong> para monitoreo 24/7</span>
        </div>
        <div className="selector-tema-botones">
          <button type="button" className={`btn-tema ${tema === 'oscuro' ? 'activo' : ''}`} onClick={() => setTema('oscuro')}>🌙 Oscuro</button>
          <button type="button" className={`btn-tema ${tema === 'claro' ? 'activo' : ''}`} onClick={() => setTema('claro')}>☀️ Claro</button>
        </div>
      </div>

      <div className="card-ajuste-opcion no-molestar-card">
        <div className="opcion-header-switch">
          <div className="opcion-texto">
            <strong>Modo No Molestar</strong>
            <span>Silencia notificaciones no críticas en horarios específicos.</span>
          </div>
          <label className="switch-toggle">
            <input type="checkbox" checked={noMolestar} onChange={(e) => setNoMolestar(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
        </div>

        {noMolestar && (
          <div className="no-molestar-horarios-box">
            <div className="horarios-grid">
              <div className="campo-hora">
                <label>Hora de Inicio:</label>
                <input type="time" value={horaInicioNoMolestar} onChange={(e) => setHoraInicioNoMolestar(e.target.value)} className="input-hora" />
              </div>
              <div className="campo-hora">
                <label>Hora de Fin:</label>
                <input type="time" value={horaFinNoMolestar} onChange={(e) => setHoraFinNoMolestar(e.target.value)} className="input-hora" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Idioma del Sistema</strong>
        </div>
        <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="select-idioma">
          <option value="es">Español (ES)</option>
          <option value="en">English (US)</option>
        </select>
      </div>

      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Refresco Automático (5 segundos)</strong>
        </div>
        <label className="switch-toggle">
          <input type="checkbox" checked={refrescoAuto} onChange={(e) => setRefrescoAuto(e.target.checked)} />
          <span className="switch-slider"></span>
        </label>
      </div>

      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Transmisión de Alertas a Telegram</strong>
        </div>
        <label className="switch-toggle">
          <input type="checkbox" checked={notificacionesTelegram} onChange={(e) => setNotificacionesTelegram(e.target.checked)} />
          <span className="switch-slider"></span>
        </label>
      </div>
    </div>
  );
};
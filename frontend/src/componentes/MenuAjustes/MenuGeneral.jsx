import React, { useState, useEffect } from 'react';
import { obtenerMisUmbralesService, guardarMisUmbralesService } from '../../services/alertas';

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
  setNotificacionesTelegram,
  onUmbralesActualizados,
  esAdmin
}) => {
  const [umbralCPU, setUmbralCPU] = useState(80);
  const [umbralRAM, setUmbralRAM] = useState(80);
  const [guardandoUmbrales, setGuardandoUmbrales] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    async function cargarUmbrales() {
      const datos = await obtenerMisUmbralesService();
      if (datos) {
        // null = todavía no hay alerta global de ese tipo
        setUmbralCPU(datos.cpu ?? 80);
        setUmbralRAM(datos.ram ?? 80);
      }
    }
    cargarUmbrales();
  }, []);

  const handleGuardarUmbrales = async () => {
    setGuardandoUmbrales(true);
    setMensajeExito(null);
    try {
      await guardarMisUmbralesService(umbralCPU, umbralRAM);
      setMensajeExito("Cambios guardados correctamente.");
      
      if (onUmbralesActualizados) {
        onUmbralesActualizados({ cpu: umbralCPU, ram: umbralRAM });
      }

      setTimeout(() => setMensajeExito(null), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoUmbrales(false);
    }
  };

  return (
    <div className="seccion-general-container">
      {/* 🎯 TARJETA: UMBRALES PERSONALIZADOS (Estilo delicado y limpio) */}
      <div className="card-ajuste-opcion card-umbrales-modernos">
        <div className="opcion-texto">
          <strong>Umbrales Globales del Servidor</strong>
          <span>
            {esAdmin
              ? 'Definí los topes de consumo de todo el servidor que disparan alertas para todos los usuarios.'
              : 'Topes de consumo de todo el servidor. Solo un Administrador puede modificarlos.'}
          </span>
        </div>

        {mensajeExito && (
          <div className="toast-exito-umbrales">
            {mensajeExito}
          </div>
        )}

        <div className="steppers-umbrales-grid">
          {/* Stepper CPU */}
          <div className="stepper-card">
            <span className="stepper-label">CPU Límite</span>
            <div className="stepper-controls">
              <button
                type="button"
                className="btn-stepper"
                disabled={!esAdmin}
                onClick={() => setUmbralCPU(prev => Math.max(10, prev - 1))}
                title="Reducir 1%"
              >
                −
              </button>
              <span className={`stepper-value ${umbralCPU >= 90 ? 'val-critico' : 'val-advertencia'}`}>
                {umbralCPU}%
              </span>
              <button
                type="button"
                className="btn-stepper"
                disabled={!esAdmin}
                onClick={() => setUmbralCPU(prev => Math.min(99, prev + 1))}
                title="Aumentar 1%"
              >
                +
              </button>
            </div>
          </div>

          {/* Stepper RAM */}
          <div className="stepper-card">
            <span className="stepper-label">RAM Límite</span>
            <div className="stepper-controls">
              <button
                type="button"
                className="btn-stepper"
                disabled={!esAdmin}
                onClick={() => setUmbralRAM(prev => Math.max(10, prev - 1))}
                title="Reducir 1%"
              >
                −
              </button>
              <span className={`stepper-value ${umbralRAM >= 90 ? 'val-critico' : 'val-advertencia'}`}>
                {umbralRAM}%
              </span>
              <button
                type="button"
                className="btn-stepper"
                disabled={!esAdmin}
                onClick={() => setUmbralRAM(prev => Math.min(99, prev + 1))}
                title="Aumentar 1%"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="contenedor-boton-guardar">
          <button
            type="button"
            onClick={handleGuardarUmbrales}
            disabled={guardandoUmbrales || !esAdmin}
            className="btn-guardar-umbrales-sutil"
          >
            {guardandoUmbrales ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Tema de Interfaz */}
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

      {/* Modo No Molestar */}
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

      {/* Idioma del Sistema */}
      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Idioma del Sistema</strong>
        </div>
        <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="select-idioma">
          <option value="es">Español (ES)</option>
          <option value="en">English (US)</option>
        </select>
      </div>

      {/* Refresco Automático */}
      <div className="card-ajuste-opcion">
        <div className="opcion-texto">
          <strong>Refresco Automático (5 segundos)</strong>
        </div>
        <label className="switch-toggle">
          <input type="checkbox" checked={refrescoAuto} onChange={(e) => setRefrescoAuto(e.target.checked)} />
          <span className="switch-slider"></span>
        </label>
      </div>

      {/* Transmisión Telegram */}
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
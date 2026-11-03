import { useEffect } from 'react';
import { GraficoIndividual } from '../GraficoIndividual/GraficoIndividual';
import { GraficoHistorial } from '../GraficoHistorial/GraficoHistorial';
import { AlertasProceso } from '../AlertasProceso/AlertasProceso';
import { normalizarNombreProceso } from '../../services/procesos';
import '../GraficoIndividual/GraficoIndividual.css';
import './PanelProceso.css';

/**
 * Detalle del proceso elegido, en una sola tarjeta dentro del panel lateral.
 * Solo aparece cuando se presiona un proceso. Orden: nombre y PIDs, uso actual, historial y alertas.
 */
export const PanelProceso = ({
  proceso,
  procesoMonitoreado = null,
  onCerrar,
  reglasAlertas = [],
  esAdmin = false,
  onCrearAlerta,
  onActualizarAlerta,
  onEliminarAlerta,
  onMonitorear,
  onDejarDeMonitorear,
}) => {
  // Cerrar el detalle con Escape
  useEffect(() => {
    if (!proceso) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proceso, onCerrar]);

  if (!proceso) return null;

  const enEjecucion = proceso.enEjecucion !== false;
  const reglasDelProceso = reglasAlertas.filter(
    (regla) => regla.proceso_id && normalizarNombreProceso(regla.nombre_proceso) === normalizarNombreProceso(proceso.name)
  );

  return (
    <section className="grafico-individual-container panel-proceso" aria-label={`Detalle del proceso ${proceso.name}`}>
      <div className="header-inspeccion">
        <h4 className="titulo-inspeccion">Inspección de Proceso</h4>
        <div className="panel-proceso-badges">
          {procesoMonitoreado && <span className="badge-monitoreado">Monitoreado</span>}
          <span className={`badge-activo ${enEjecucion ? '' : 'detenido'}`}>
            {enEjecucion ? 'En ejecución' : 'Detenido'}
          </span>
          <button type="button" className="btn-cerrar-panel-proceso" onClick={onCerrar} title="Cerrar detalle (Esc)">
            ✕
          </button>
        </div>
      </div>

      {/* 1. Nombre, PIDs y uso actual */}
      <GraficoIndividual proceso={proceso} />

      {/* 2. Historial guardado (key: al cambiar de proceso se reinicia el rango y lo cargado) */}
      <div className="panel-proceso-seccion">
        <GraficoHistorial
          key={proceso.name}
          nombreProceso={proceso.name}
          procesoMonitoreado={procesoMonitoreado}
          esAdmin={esAdmin}
          onMonitorear={onMonitorear}
          onDejarDeMonitorear={onDejarDeMonitorear}
        />
      </div>

      {/* 3. Alertas del proceso (key: se reinicia el formulario al cambiar de proceso) */}
      <div className="panel-proceso-seccion">
        <AlertasProceso
          key={proceso.name}
          nombreProceso={proceso.name}
          reglas={reglasDelProceso}
          esAdmin={esAdmin}
          onCrear={onCrearAlerta}
          onActualizar={onActualizarAlerta}
          onEliminar={onEliminarAlerta}
        />
      </div>
    </section>
  );
};

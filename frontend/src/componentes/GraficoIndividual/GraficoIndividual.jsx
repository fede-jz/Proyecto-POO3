import './GraficoIndividual.css';

/**
 * Datos del proceso dentro del detalle del panel lateral: nombre, PIDs y uso actual de CPU y RAM.
 */
export const GraficoIndividual = ({ proceso }) => {
  if (!proceso) return null;

  // Los procesos monitoreados se pueden abrir aunque no estén corriendo
  const enEjecucion = proceso.enEjecucion !== false;

  return (
    <div className="datos-proceso">
      <div className="detalles-proceso">
        {/* Nombre */}
        <div className="fila-detalle">
          <span className="label">Nombre:</span>
          <span className="valor-nombre">{proceso.name}</span>
        </div>

        {/* PIDs Asociados (como máximo dos renglones; el resto con scroll) */}
        <div className="fila-detalle">
          <span className="label">PIDs Asociados:</span>
          <span className="valor-pids font-mono">
            {proceso.pids && proceso.pids.length > 0 ? proceso.pids.join(', ') : 'N/A'}
          </span>
        </div>
      </div>

      {/* Uso actual de CPU y RAM */}
      <div className="metricas-grafico-box">
        <div className="barra-grupo">
          <div className="barra-info">
            <span>Uso de CPU</span>
            <span className="cpu-valor font-mono">{enEjecucion ? `${proceso.cpu_percent}%` : '—'}</span>
          </div>
          <div className="barra-fondo">
            <div
              className="barra-fill cpu-fill"
              style={{ width: `${enEjecucion ? Math.min(proceso.cpu_percent, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="barra-grupo">
          <div className="barra-info">
            <span>Uso de Memoria RAM</span>
            <span className="ram-valor font-mono">{enEjecucion ? `${proceso.memory_percent}%` : '—'}</span>
          </div>
          <div className="barra-fondo">
            <div
              className="barra-fill ram-fill"
              style={{ width: `${enEjecucion ? Math.min(proceso.memory_percent, 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

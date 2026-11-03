import { useState, useEffect } from 'react';
import './PoligonoRecursos.css';

/**
 * Gráfico ampliado de consumo (CPU/RAM) de las últimas muestras.
 * Se abre en un modal al hacer clic en las tarjetas de CPU o RAM del Dashboard.
 */
export const PoligonoRecursos = ({
  historial = [],
  umbralCpu = null,
  umbralRam = null,
  filtroProcesosNombres = null,
  onRestablecerFiltro,
  metricaInicial = 'ambas',
  onCerrar,
}) => {
  const [metricaSeleccionada, setMetricaSeleccionada] = useState(metricaInicial);
  const [puntoHover, setPuntoHover] = useState(null);
  // Siempre se muestra ampliado: la vista chica ahora son las tarjetas de CPU y RAM
  const maximizado = true;

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCerrar) onCerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCerrar]);

  // Mientras el gráfico ampliado está abierto se oculta el scroll de la página de atrás
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  const cantidadMuestras = historial.length;
  const cpuValores = historial.map((m) => m.cpu);
  const ramValores = historial.map((m) => m.ram);

  const cpuActual = cantidadMuestras > 0 ? cpuValores[cantidadMuestras - 1] : 0;
  const ramActual = cantidadMuestras > 0 ? ramValores[cantidadMuestras - 1] : 0;

  const cpuMax = cantidadMuestras > 0 ? Math.max(...cpuValores) : 0;
  const ramMax = cantidadMuestras > 0 ? Math.max(...ramValores) : 0;

  const cpuPromedio =
    cantidadMuestras > 0 ? (cpuValores.reduce((a, b) => a + b, 0) / cantidadMuestras).toFixed(1) : 0;
  const ramPromedio =
    cantidadMuestras > 0 ? (ramValores.reduce((a, b) => a + b, 0) / cantidadMuestras).toFixed(1) : 0;

  // Dimensiones dinámicas según el estado normal o maximizado
  const width = maximizado ? 820 : 360;
  const height = maximizado ? 320 : 160;
  const padding = maximizado ? 35 : 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const getX = (index) => {
    if (cantidadMuestras <= 1) return padding;
    return padding + (index / (cantidadMuestras - 1)) * chartWidth;
  };

  const getY = (value) => {
    const clamped = Math.max(0, Math.min(100, value));
    return height - padding - (clamped / 100) * chartHeight;
  };

  const puntosCpu = historial.map((m, i) => `${getX(i)},${getY(m.cpu)}`).join(' ');
  const puntosRam = historial.map((m, i) => `${getX(i)},${getY(m.ram)}`).join(' ');

  // Coordenadas para cerrar el área bajo la curva para el gradiente
  const areaCpu =
    cantidadMuestras > 0
      ? `${getX(0)},${height - padding} ${puntosCpu} ${getX(cantidadMuestras - 1)},${height - padding}`
      : '';
  const areaRam =
    cantidadMuestras > 0
      ? `${getX(0)},${height - padding} ${puntosRam} ${getX(cantidadMuestras - 1)},${height - padding}`
      : '';

  // Horario inicial y final para el eje X de referencia
  const horaInicio = cantidadMuestras > 0 ? historial[0].time : '';
  const horaFin = cantidadMuestras > 0 ? historial[cantidadMuestras - 1].time : '';

  const contenidoCard = (
    <div className={`card-poligono ${maximizado ? 'en-modal' : ''}`}>
      {/* Cabecera con selector y botón Maximizar / Minimizar */}
      <div className="poligono-header">
        <div className="poligono-titulos">
          <div className="titulo-con-badge">
            <h4>Consumo reciente</h4>
            {filtroProcesosNombres && filtroProcesosNombres.length > 0 ? (
              <span className="badge-modo-filtro" title={filtroProcesosNombres.join(', ')}>
                Filtrado ({filtroProcesosNombres.length} proc)
              </span>
            ) : (
              <span className="badge-modo-general">General</span>
            )}
          </div>
          <p className="sub-poligono">
            Historial optimizado (últimas {cantidadMuestras}/30 muestras)
          </p>
        </div>

        <div className="poligono-acciones-header">
          {/* Selector de métricas */}
          <div className="selector-metricas">
            <button
              type="button"
              className={metricaSeleccionada === 'cpu' ? 'activo' : ''}
              onClick={() => setMetricaSeleccionada('cpu')}
            >
              CPU
            </button>
            <button
              type="button"
              className={metricaSeleccionada === 'ram' ? 'activo' : ''}
              onClick={() => setMetricaSeleccionada('ram')}
            >
              RAM
            </button>
            <button
              type="button"
              className={metricaSeleccionada === 'ambas' ? 'activo' : ''}
              onClick={() => setMetricaSeleccionada('ambas')}
            >
              Ambas
            </button>
          </div>

          {/* Cerrar el gráfico ampliado */}
          <button
            type="button"
            className="btn-toggle-maximizar"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            aria-label="Cerrar"
          >
            <span className="icono-max">✕ Cerrar</span>
          </button>
        </div>
      </div>

      {/* Banner de filtro activo de procesos seleccionados */}
      {filtroProcesosNombres && filtroProcesosNombres.length > 0 && (
        <div className="banner-filtro-poligono">
          <div className="texto-filtro-poligono">
            <span>📊 Analizando consumo exclusivo de: </span>
            <strong>{filtroProcesosNombres.join(', ')}</strong>
          </div>
          {onRestablecerFiltro && (
            <button
              type="button"
              className="btn-restablecer-poligono"
              onClick={onRestablecerFiltro}
              title="Volver a analizar todos los procesos del sistema"
            >
              Restablecer a General
            </button>
          )}
        </div>
      )}

      {/* Gráfico SVG */}
      <div className={`grafico-svg-container ${maximizado ? 'svg-maximizado' : ''}`}>
        {cantidadMuestras === 0 ? (
          <div className="sin-datos">Recopilando telemetría inicial...</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="svg-poligono">
            <defs>
              <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-cpu)' }} stopOpacity="0.35" />
                <stop offset="100%" style={{ stopColor: 'var(--color-cpu)' }} stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-ram)' }} stopOpacity="0.35" />
                <stop offset="100%" style={{ stopColor: 'var(--color-ram)' }} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Umbral global de cada métrica visible (CPU en amarillo, RAM en verde, como sus líneas) */}
            {umbralCpu != null && (metricaSeleccionada === 'cpu' || metricaSeleccionada === 'ambas') && (
              <>
                <line
                  x1={padding}
                  y1={getY(umbralCpu)}
                  x2={width - padding}
                  y2={getY(umbralCpu)}
                  className="linea-umbral advertencia"
                />
                <text x={width - padding - 110} y={getY(umbralCpu) - 5} className="label-umbral-adv">
                  Umbral CPU ({Number(umbralCpu).toFixed(0)}%)
                </text>
              </>
            )}
            {umbralRam != null && (metricaSeleccionada === 'ram' || metricaSeleccionada === 'ambas') && (
              <>
                <line
                  x1={padding}
                  y1={getY(umbralRam)}
                  x2={width - padding}
                  y2={getY(umbralRam)}
                  className="linea-umbral umbral-ram"
                />
                <text
                  x={width - padding - 110}
                  y={getY(umbralRam) + (umbralCpu === umbralRam && metricaSeleccionada === 'ambas' ? 14 : -5)}
                  className="label-umbral-ram"
                >
                  Umbral RAM ({Number(umbralRam).toFixed(0)}%)
                </text>
              </>
            )}

            {/* Cuadrícula de porcentaje */}
            <text x={2} y={getY(100) + 4} className="eje-label">
              100%
            </text>
            <line x1={padding} y1={getY(100)} x2={width - padding} y2={getY(100)} className="grid-line" />
            <text x={2} y={getY(50) + 4} className="eje-label">
              50%
            </text>
            <line x1={padding} y1={getY(50)} x2={width - padding} y2={getY(50)} className="grid-line" />
            <text x={2} y={getY(0) + 4} className="eje-label">
              0%
            </text>
            <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} className="grid-line" />

            {/* Área bajo la curva y Poligonal CPU */}
            {(metricaSeleccionada === 'cpu' || metricaSeleccionada === 'ambas') && (
              <>
                <polygon points={areaCpu} fill="url(#gradCpu)" />
                <polyline fill="none" points={puntosCpu} className="poligono-linea cpu" />
                {historial.map((m, i) => (
                  <circle
                    key={`cpu-${i}`}
                    cx={getX(i)}
                    cy={getY(m.cpu)}
                    r={maximizado ? 4 : 2.5}
                    className="nodo-punto cpu"
                    onMouseEnter={() => setPuntoHover({ time: m.time, tipo: 'CPU', valor: m.cpu })}
                    onMouseLeave={() => setPuntoHover(null)}
                  />
                ))}
              </>
            )}

            {/* Área bajo la curva y Poligonal RAM */}
            {(metricaSeleccionada === 'ram' || metricaSeleccionada === 'ambas') && (
              <>
                <polygon points={areaRam} fill="url(#gradRam)" />
                <polyline fill="none" points={puntosRam} className="poligono-linea ram" />
                {historial.map((m, i) => (
                  <circle
                    key={`ram-${i}`}
                    cx={getX(i)}
                    cy={getY(m.ram)}
                    r={maximizado ? 4 : 2.5}
                    className="nodo-punto ram"
                    onMouseEnter={() => setPuntoHover({ time: m.time, tipo: 'RAM', valor: m.ram })}
                    onMouseLeave={() => setPuntoHover(null)}
                  />
                ))}
              </>
            )}
          </svg>
        )}

        {/* Tooltip flotante */}
        {puntoHover && (
          <div className="tooltip-flotante">
            <strong>
              {puntoHover.tipo}: {puntoHover.valor}%
            </strong>
            <span>{puntoHover.time}</span>
          </div>
        )}
      </div>

      {/* Eje X con piso horario */}
      <div className="eje-x-horarios">
        <span>{horaInicio || 'Inicio'}</span>
        <span>• Registro en tiempo real (muestreo continuo) •</span>
        <span>{horaFin || 'Actual'}</span>
      </div>

      {/* Estadísticas de soporte */}
      <div className={`poligono-stats ${maximizado ? 'stats-maximizado' : ''}`}>
        <div className="stat-group">
          <span className="stat-title">CPU ({cpuActual}%)</span>
          <div className="stat-details">
            <span>
              Máx: <strong>{cpuMax}%</strong>
            </span>
            <span>
              Prom: <strong>{cpuPromedio}%</strong>
            </span>
          </div>
        </div>
        <div className="stat-group">
          <span className="stat-title">RAM ({ramActual}%)</span>
          <div className="stat-details">
            <span>
              Máx: <strong>{ramMax}%</strong>
            </span>
            <span>
              Prom: <strong>{ramPromedio}%</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Se muestra en un modal de pantalla completa; clic fuera del gráfico lo cierra
  return (
    <div
      className="poligono-backdrop-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onCerrar) onCerrar();
      }}
    >
      <div className="contenedor-modal-poligono">{contenidoCard}</div>
    </div>
  );
};

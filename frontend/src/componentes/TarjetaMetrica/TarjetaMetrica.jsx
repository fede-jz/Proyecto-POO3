import './TarjetaMetrica.css';

// Dimensiones del mini-gráfico (se escala al ancho de la tarjeta)
const ANCHO = 300;
const ALTO = 56;

/**
 * Tarjeta de métrica. Si recibe `valores` (porcentajes de las últimas muestras) muestra además
 * un mini-gráfico con la línea de su umbral y el máximo y promedio; al hacer clic se puede ampliar.
 * Con `detalles` ([{ etiqueta, valor }]) muestra datos extra debajo del valor.
 */
export const TarjetaMetrica = ({
  title,
  value,
  unit,
  subtitle,
  valores,
  serie = 'cpu',
  umbral,
  detalles,
  etiquetaFiltro,
  onAmpliar,
}) => {
  const conGrafico = Array.isArray(valores);
  const cantidad = conGrafico ? valores.length : 0;

  const getX = (i) => (cantidad <= 1 ? ANCHO : (i / (cantidad - 1)) * ANCHO);
  const getY = (v) => ALTO - (Math.max(0, Math.min(100, v)) / 100) * ALTO;

  const puntos = conGrafico ? valores.map((v, i) => `${getX(i)},${getY(v)}`).join(' ') : '';
  const area = cantidad > 1 ? `0,${ALTO} ${puntos} ${ANCHO},${ALTO}` : '';
  const maximo = cantidad > 0 ? Math.max(...valores).toFixed(1) : '0.0';
  const promedio = cantidad > 0 ? (valores.reduce((a, b) => a + b, 0) / cantidad).toFixed(1) : '0.0';

  const contenido = (
    <>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {etiquetaFiltro && <span className="metric-badge-filtro">{etiquetaFiltro}</span>}
      </div>
      <div className="metric-value-container">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      {conGrafico && (
        <>
          <svg className="metric-sparkline" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" aria-hidden="true">
            {umbral != null && (
              <line x1="0" x2={ANCHO} y1={getY(umbral)} y2={getY(umbral)} className="sparkline-umbral" />
            )}
            {area && <polygon points={area} className={`sparkline-area ${serie}`} />}
            {cantidad > 0 && <polyline points={puntos} fill="none" className={`sparkline-linea ${serie}`} />}
          </svg>
          <div className="metric-stats">
            <span>Máx: <strong>{maximo}%</strong></span>
            <span>Prom: <strong>{promedio}%</strong></span>
            {umbral != null && <span className="metric-umbral">Umbral: <strong>{Number(umbral).toFixed(0)}%</strong></span>}
          </div>
        </>
      )}

      {Array.isArray(detalles) && detalles.length > 0 && (
        <dl className="metric-detalles">
          {detalles.map((d) => (
            <div key={d.etiqueta} className="metric-detalle">
              <dt>{d.etiqueta}</dt>
              <dd>{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {subtitle && <span className="metric-subtitle">{subtitle}</span>}
    </>
  );

  if (onAmpliar) {
    return (
      <button type="button" className="metric-card metric-card-ampliable" onClick={onAmpliar} title="Ver el gráfico ampliado">
        {contenido}
      </button>
    );
  }

  return <div className="metric-card">{contenido}</div>;
};

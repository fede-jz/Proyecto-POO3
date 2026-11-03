import { useState, useEffect, useCallback } from 'react';
import { obtenerHistorialService } from '../../services/procesos';
import './GraficoHistorial.css';

const RANGOS = [
  { horas: 1, etiqueta: '1 h' },
  { horas: 6, etiqueta: '6 h' },
  { horas: 24, etiqueta: '24 h' },
  { horas: 168, etiqueta: '7 días' },
];

// El backend guarda una muestra cada 30 segundos; se refresca con la misma frecuencia
const INTERVALO_REFRESCO_MS = 30000;

const formatearFecha = (fecha, horas) => {
  const d = new Date(fecha);
  return horas > 24
    ? d.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Historial guardado de CPU y RAM de un proceso.
 * Si el proceso no se monitorea muestra un aviso y, para los administradores, el botón para empezar a monitorearlo.
 */
export const GraficoHistorial = ({
  nombreProceso,
  procesoMonitoreado = null,
  esAdmin = false,
  onMonitorear,
  onDejarDeMonitorear,
}) => {
  const [horas, setHoras] = useState(1);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [puntoHover, setPuntoHover] = useState(null);
  const [monitoreando, setMonitoreando] = useState(false);
  const [confirmarDejar, setConfirmarDejar] = useState(false);

  const procesoId = procesoMonitoreado?.id;

  const cargarHistorial = useCallback(async () => {
    if (!procesoId) return;
    const res = await obtenerHistorialService(procesoId, horas);
    setCargando(false);
    if (res.success) {
      setHistorial(res.historial);
      setError('');
    } else {
      setError(res.mensaje);
    }
  }, [procesoId, horas]);

  useEffect(() => {
    if (!procesoId) return undefined;
    const primeraCarga = setTimeout(cargarHistorial, 0);
    const intervalo = setInterval(cargarHistorial, INTERVALO_REFRESCO_MS);
    return () => {
      clearTimeout(primeraCarga);
      clearInterval(intervalo);
    };
  }, [procesoId, cargarHistorial]);

  const cambiarRango = (nuevasHoras) => {
    if (nuevasHoras === horas) return;
    setCargando(true);
    setHistorial([]);
    setHoras(nuevasHoras);
  };

  const handleMonitorear = async () => {
    if (!onMonitorear) return;
    setMonitoreando(true);
    setError('');
    const res = await onMonitorear(nombreProceso);
    setMonitoreando(false);
    if (!res?.success) setError(res?.mensaje || 'No se pudo empezar a monitorear el proceso.');
  };

  const handleDejarDeMonitorear = async () => {
    if (!onDejarDeMonitorear || !procesoId) return;
    setMonitoreando(true);
    setError('');
    const res = await onDejarDeMonitorear(procesoId);
    setMonitoreando(false);
    if (res?.success) {
      setConfirmarDejar(false);
      setHistorial([]);
      setCargando(true);
    } else {
      setError(res?.mensaje || 'No se pudo dejar de monitorear el proceso.');
    }
  };

  // Proceso sin monitorear: no hay historial guardado
  if (!procesoMonitoreado) {
    return (
      <div className="card-historial">
        <div className="historial-header">
          <h4>Historial:</h4>
          <span className="badge-sin-monitoreo">Sin monitorear</span>
        </div>
        <div className="historial-sin-monitoreo">
          <span className="icono-historial">📈</span>
          <p>Este proceso no se está monitoreando. Para guardar su historial de CPU y RAM hay que comenzar a monitorearlo.</p>
          {esAdmin ? (
            <button type="button" className="btn-monitorear" disabled={monitoreando} onClick={handleMonitorear}>
              {monitoreando ? 'Iniciando...' : 'Comenzar a monitorear'}
            </button>
          ) : (
            <span className="aviso-solo-admin">Solo los administradores pueden comenzar a monitorear procesos.</span>
          )}
          {error && <p className="error-historial" role="alert">{error}</p>}
        </div>
      </div>
    );
  }

  // Dimensiones del gráfico SVG (mismo estilo que el Polígono de Consumo)
  const width = 480;
  const height = 180;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const cantidad = historial.length;

  const getX = (index) => (cantidad <= 1 ? padding + chartWidth / 2 : padding + (index / (cantidad - 1)) * chartWidth);
  const getY = (valor) => height - padding - (Math.max(0, Math.min(100, valor)) / 100) * chartHeight;

  const puntosCpu = historial.map((m, i) => `${getX(i)},${getY(m.cpu_porcentaje)}`).join(' ');
  const puntosRam = historial.map((m, i) => `${getX(i)},${getY(m.ram_porcentaje)}`).join(' ');

  const promedio = (clave) =>
    cantidad > 0 ? (historial.reduce((acc, m) => acc + m[clave], 0) / cantidad).toFixed(1) : '0.0';
  const maximo = (clave) => (cantidad > 0 ? Math.max(...historial.map((m) => m[clave])).toFixed(1) : '0.0');

  return (
    <div className="card-historial">
      <div className="historial-header">
        <h4>Historial:</h4>
        <div className="selector-rango-historial">
          {RANGOS.map((r) => (
            <button
              key={r.horas}
              type="button"
              className={horas === r.horas ? 'activo' : ''}
              onClick={() => cambiarRango(r.horas)}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="historial-svg-container">
        {cargando ? (
          <div className="historial-sin-datos">Cargando historial...</div>
        ) : cantidad === 0 ? (
          <div className="historial-sin-datos">
            Todavía no hay muestras en este rango. Se guarda una cada 30 segundos.
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="svg-historial">
            {[100, 50, 0].map((valor) => (
              <g key={valor}>
                <line x1={padding} y1={getY(valor)} x2={width - padding} y2={getY(valor)} className="grid-line-historial" />
                <text x={2} y={getY(valor) + 4} className="eje-label-historial">{valor}%</text>
              </g>
            ))}

            <polyline fill="none" points={puntosCpu} className="linea-historial cpu" />
            <polyline fill="none" points={puntosRam} className="linea-historial ram" />

            {/* Zonas invisibles para mostrar el valor de cada punto al pasar el mouse */}
            {historial.map((m, i) => (
              <rect
                key={m.registrado_en}
                x={getX(i) - chartWidth / Math.max(cantidad, 1) / 2}
                y={padding}
                width={chartWidth / Math.max(cantidad, 1)}
                height={chartHeight}
                className="zona-hover-historial"
                onMouseEnter={() => setPuntoHover(m)}
                onMouseLeave={() => setPuntoHover(null)}
              />
            ))}
          </svg>
        )}

        {puntoHover && (
          <div className="tooltip-historial">
            <span>{new Date(puntoHover.registrado_en).toLocaleString()}</span>
            <strong className="cpu">CPU {puntoHover.cpu_porcentaje.toFixed(1)}%</strong>
            <strong className="ram">RAM {puntoHover.ram_porcentaje.toFixed(1)}%</strong>
          </div>
        )}
      </div>

      {cantidad > 0 && (
        <div className="eje-x-historial">
          <span>{formatearFecha(historial[0].registrado_en, horas)}</span>
          <span>{formatearFecha(historial[cantidad - 1].registrado_en, horas)}</span>
        </div>
      )}

      <div className="stats-historial">
        <div className="stat-historial">
          <span className="titulo-stat cpu">CPU</span>
          <span>Máx: <strong>{maximo('cpu_porcentaje')}%</strong></span>
          <span>Prom: <strong>{promedio('cpu_porcentaje')}%</strong></span>
        </div>
        <div className="stat-historial">
          <span className="titulo-stat ram">RAM</span>
          <span>Máx: <strong>{maximo('ram_porcentaje')}%</strong></span>
          <span>Prom: <strong>{promedio('ram_porcentaje')}%</strong></span>
        </div>
      </div>

      {esAdmin && onDejarDeMonitorear && (
        <div className="pie-historial">
          {confirmarDejar ? (
            <div className="confirmar-dejar-monitorear">
              <p>
                Se va a borrar <strong>todo el historial y las alertas</strong> de este proceso. ¿Dejar de monitorearlo?
              </p>
              <div className="botones-confirmar-dejar">
                <button type="button" className="btn-confirmar-dejar" disabled={monitoreando} onClick={handleDejarDeMonitorear}>
                  {monitoreando ? 'Eliminando...' : 'Sí, dejar de monitorear'}
                </button>
                <button type="button" className="btn-cancelar-dejar" onClick={() => setConfirmarDejar(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-dejar-monitorear" onClick={() => setConfirmarDejar(true)}>
              Dejar de monitorear
            </button>
          )}
        </div>
      )}

      {error && <p className="error-historial" role="alert">{error}</p>}
    </div>
  );
};

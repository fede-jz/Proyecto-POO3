import { useState } from 'react';
import './AlertasProceso.css';

const TIPOS_ALERTA = [
  { valor: 'caida', etiqueta: 'Caída', descripcion: 'Avisa cuando el proceso deja de ejecutarse' },
  { valor: 'cpu', etiqueta: 'CPU', descripcion: 'Avisa cuando el uso de CPU supera el límite' },
  { valor: 'ram', etiqueta: 'RAM', descripcion: 'Avisa cuando el uso de RAM supera el límite' },
];

const etiquetaTipo = (tipo) => TIPOS_ALERTA.find((t) => t.valor === tipo)?.etiqueta || tipo;

const limiteValido = (valor) => {
  const numero = parseFloat(valor);
  return !Number.isNaN(numero) && numero >= 0 && numero <= 100;
};

/**
 * Alertas configuradas sobre un proceso.
 * Todos los usuarios las ven; solo los administradores pueden crearlas, editarlas, pausarlas y eliminarlas.
 */
export const AlertasProceso = ({
  nombreProceso,
  reglas = [],
  esAdmin = false,
  onCrear,
  onActualizar,
  onEliminar,
}) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tipoNuevo, setTipoNuevo] = useState('');
  const [limiteNuevo, setLimiteNuevo] = useState('80');
  const [editandoId, setEditandoId] = useState(null);
  const [limiteEditado, setLimiteEditado] = useState('');
  const [confirmarEliminarId, setConfirmarEliminarId] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  // Solo puede haber una alerta de cada tipo por proceso
  const tiposDisponibles = TIPOS_ALERTA.filter((t) => !reglas.some((r) => r.tipo === t.valor));
  const tipoSeleccionado = tiposDisponibles.some((t) => t.valor === tipoNuevo)
    ? tipoNuevo
    : tiposDisponibles[0]?.valor || '';

  const ejecutar = async (accion) => {
    setProcesando(true);
    setError('');
    const res = await accion();
    setProcesando(false);
    if (!res?.success) {
      setError(res?.mensaje || 'No se pudo completar la acción.');
      return false;
    }
    return true;
  };

  const handleCrear = async () => {
    if (!onCrear || !tipoSeleccionado) return;
    if (tipoSeleccionado !== 'caida' && !limiteValido(limiteNuevo)) {
      setError('El límite tiene que ser un porcentaje entre 0 y 100.');
      return;
    }
    const ok = await ejecutar(() => onCrear(nombreProceso, tipoSeleccionado, limiteNuevo));
    if (ok) {
      setMostrarFormulario(false);
      setTipoNuevo('');
      setLimiteNuevo('80');
    }
  };

  const handleGuardarLimite = async (regla) => {
    if (!limiteValido(limiteEditado)) {
      setError('El límite tiene que ser un porcentaje entre 0 y 100.');
      return;
    }
    const ok = await ejecutar(() => onActualizar(regla.id, { valor_limite: parseFloat(limiteEditado) }));
    if (ok) setEditandoId(null);
  };

  const handleCambiarActivo = (regla) => {
    if (!onActualizar) return;
    ejecutar(() => onActualizar(regla.id, { activo: !regla.activo }));
  };

  const handleEliminar = async (regla) => {
    if (!onEliminar) return;
    const ok = await ejecutar(() => onEliminar(regla.id));
    if (ok) setConfirmarEliminarId(null);
  };

  const iniciarEdicion = (regla) => {
    setEditandoId(regla.id);
    setLimiteEditado(String(regla.valor_limite ?? ''));
    setConfirmarEliminarId(null);
    setError('');
  };

  return (
    <div className="seccion-alertas-proceso">
      <div className="header-alertas-proceso">
        <span className="label">Alertas:</span>
        {esAdmin && !mostrarFormulario && tiposDisponibles.length > 0 && (
          <button
            type="button"
            className="btn-abrir-nueva-alerta"
            onClick={() => {
              setMostrarFormulario(true);
              setError('');
            }}
            title="Crear una alerta para este proceso"
          >
            + Alerta
          </button>
        )}
      </div>

      {reglas.length > 0 ? (
        <ul className="lista-alertas-proceso">
          {reglas.map((regla) => (
            <li key={regla.id} className={`item-alerta-proceso ${regla.activo ? '' : 'inactiva'}`}>
              <div className="info-alerta-proceso">
                <span className={`badge-tipo-alerta tipo-${regla.tipo}`}>{etiquetaTipo(regla.tipo)}</span>

                {editandoId === regla.id ? (
                  <span className="editor-limite-alerta">
                    &gt;
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={limiteEditado}
                      onChange={(e) => setLimiteEditado(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGuardarLimite(regla);
                        if (e.key === 'Escape') setEditandoId(null);
                      }}
                      className="input-limite-alerta font-mono"
                      autoFocus
                    />
                    %
                  </span>
                ) : (
                  <span className="limite-alerta font-mono">
                    {regla.tipo === 'caida' ? 'Al detenerse' : `> ${Number(regla.valor_limite).toFixed(0)}%`}
                  </span>
                )}

                <span className={`estado-alerta-proceso ${regla.activo ? 'activa' : 'pausada'}`}>
                  {regla.activo ? 'Activa' : 'Pausada'}
                </span>
              </div>

              {esAdmin && (
                <div className="acciones-alerta-proceso">
                  {editandoId === regla.id ? (
                    <>
                      <button type="button" className="btn-guardar-tag" disabled={procesando} onClick={() => handleGuardarLimite(regla)}>
                        Guardar
                      </button>
                      <button type="button" className="btn-cancelar-tag" onClick={() => setEditandoId(null)}>
                        ✕
                      </button>
                    </>
                  ) : confirmarEliminarId === regla.id ? (
                    <>
                      <span className="texto-confirmar-eliminar">¿Eliminar?</span>
                      <button type="button" className="btn-confirmar-eliminar" disabled={procesando} onClick={() => handleEliminar(regla)}>
                        Sí
                      </button>
                      <button type="button" className="btn-cancelar-tag" onClick={() => setConfirmarEliminarId(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      {regla.tipo !== 'caida' && (
                        <button
                          type="button"
                          className="btn-accion-alerta-proceso"
                          disabled={procesando}
                          onClick={() => iniciarEdicion(regla)}
                          title="Cambiar el límite"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-accion-alerta-proceso"
                        disabled={procesando}
                        onClick={() => handleCambiarActivo(regla)}
                        title={regla.activo ? 'Pausar la alerta' : 'Activar la alerta'}
                      >
                        {regla.activo ? '⏸' : '▶'}
                      </button>
                      <button
                        type="button"
                        className="btn-accion-alerta-proceso peligro"
                        disabled={procesando}
                        onClick={() => {
                          setConfirmarEliminarId(regla.id);
                          setEditandoId(null);
                          setError('');
                        }}
                        title="Eliminar la alerta y sus eventos"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="sin-etiquetas-aviso">Este proceso no tiene alertas configuradas</span>
      )}

      {esAdmin && mostrarFormulario && (
        <div className="form-nueva-alerta-proceso">
          <div className="selector-tipo-alerta">
            {tiposDisponibles.map((t) => (
              <button
                key={t.valor}
                type="button"
                className={`btn-tipo-alerta ${tipoSeleccionado === t.valor ? 'activo' : ''}`}
                onClick={() => setTipoNuevo(t.valor)}
                title={t.descripcion}
              >
                {t.etiqueta}
              </button>
            ))}
          </div>

          {tipoSeleccionado !== 'caida' && (
            <label className="campo-limite-alerta">
              Límite
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={limiteNuevo}
                onChange={(e) => setLimiteNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCrear();
                }}
                className="input-limite-alerta font-mono"
              />
              %
            </label>
          )}

          <div className="botones-nueva-alerta">
            <button type="button" className="btn-guardar-tag" disabled={procesando} onClick={handleCrear}>
              {procesando ? 'Creando...' : 'Crear alerta'}
            </button>
            <button
              type="button"
              className="btn-cancelar-tag"
              onClick={() => {
                setMostrarFormulario(false);
                setError('');
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-alertas-proceso" role="alert">{error}</p>}

      {!esAdmin && (
        <span className="aviso-solo-admin">Solo los administradores pueden crear o modificar alertas.</span>
      )}
    </div>
  );
};

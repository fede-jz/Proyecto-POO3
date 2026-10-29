import React, { useState } from 'react';
import './GraficoIndividual.css';

const PRESET_TAGS = ['Base de Datos', 'Web', 'Sistema', 'Desarrollo', 'Crítico', 'Segundo Plano'];

export const GraficoIndividual = ({
  proceso,
  onAddTag,
  onRemoveTag,
}) => {
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [mostrarInputTag, setMostrarInputTag] = useState(false);

  if (!proceso) {
    return (
      <div className="grafico-individual-container placeholder">
        <div className="placeholder-content">
          <span className="icono-cursor">👆</span>
          <p>Selecciona un proceso de la lista para ver su rendimiento detallado.</p>
        </div>
      </div>
    );
  }

  const tags = proceso.tags || [];

  const handleAgregar = (tagAAgregar) => {
    const cleanTag = tagAAgregar.trim();
    if (!cleanTag) return;
    if (onAddTag && !tags.includes(cleanTag)) {
      onAddTag(proceso.name, cleanTag);
    }
    setNuevaEtiqueta('');
    setMostrarInputTag(false);
  };

  return (
    <div className="grafico-individual-container">
      <div className="header-inspeccion">
        <h4 className="titulo-inspeccion">Inspección de Proceso</h4>
        <span className="badge-activo">Activo</span>
      </div>

      <div className="detalles-proceso">
        {/* Nombre */}
        <div className="fila-detalle">
          <span className="label">Nombre:</span>
          <span className="valor-nombre">{proceso.name}</span>
        </div>

        {/* PIDs Asociados */}
        <div className="fila-detalle">
          <span className="label">PIDs Asociados:</span>
          <span className="valor-pids font-mono">
            {proceso.pids && proceso.pids.length > 0 ? proceso.pids.join(', ') : 'N/A'}
          </span>
        </div>

        {/* Etiquetas Sincronizadas */}
        <div className="seccion-etiquetas-inspeccion">
          <div className="header-tags-inspeccion">
            <span className="label">Etiquetas:</span>
            {!mostrarInputTag && (
              <button
                type="button"
                className="btn-abrir-add-tag"
                onClick={() => setMostrarInputTag(true)}
                title="Agregar nueva etiqueta a este proceso"
              >
                + Etiqueta
              </button>
            )}
          </div>

          <div className="lista-tags-inspeccion">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span key={tag} className="badge-etiqueta-inspeccion">
                  <span className="tag-texto">{tag}</span>
                  {onRemoveTag && (
                    <button
                      type="button"
                      className="btn-eliminar-tag"
                      onClick={() => onRemoveTag(proceso.name, tag)}
                      title={`Quitar etiqueta "${tag}"`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="sin-etiquetas-aviso">Ninguna etiqueta asignada</span>
            )}
          </div>

          {mostrarInputTag && (
            <div className="form-agregar-tag-inspeccion">
              <input
                type="text"
                placeholder="Nombre de etiqueta..."
                value={nuevaEtiqueta}
                onChange={(e) => setNuevaEtiqueta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAgregar(nuevaEtiqueta);
                  if (e.key === 'Escape') setMostrarInputTag(false);
                }}
                className="input-tag-inspeccion"
                autoFocus
              />
              <button
                type="button"
                className="btn-guardar-tag"
                onClick={() => handleAgregar(nuevaEtiqueta)}
              >
                Guardar
              </button>
              <button
                type="button"
                className="btn-cancelar-tag"
                onClick={() => setMostrarInputTag(false)}
              >
                ✕
              </button>

              {/* Sugerencias rápidas */}
              <div className="sugerencias-rapidas-inspeccion">
                {PRESET_TAGS.filter((t) => !tags.includes(t))
                  .slice(0, 4)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="btn-preset-tag"
                      onClick={() => handleAgregar(t)}
                    >
                      + {t}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos de barras individuales */}
      <div className="metricas-grafico-box">
        {/* Barra CPU Proceso */}
        <div className="barra-grupo">
          <div className="barra-info">
            <span>Uso de CPU</span>
            <span className="cpu-valor font-mono">{proceso.cpu_percent}%</span>
          </div>
          <div className="barra-fondo">
            <div
              className="barra-fill cpu-fill"
              style={{ width: `${Math.min(proceso.cpu_percent, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Barra RAM Proceso */}
        <div className="barra-grupo">
          <div className="barra-info">
            <span>Uso de Memoria RAM</span>
            <span className="ram-valor font-mono">{proceso.memory_percent}%</span>
          </div>
          <div className="barra-fondo">
            <div
              className="barra-fill ram-fill"
              style={{ width: `${Math.min(proceso.memory_percent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

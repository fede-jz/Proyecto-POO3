import React, { useState, useId } from 'react';
import './TablaProcesos.css';

const ELEMENTOS_POR_PAGINA = 10;

const SUGERENCIAS_ETIQUETAS = [
  'Base de Datos',
  'Web',
  'Sistema',
  'Desarrollo',
  'Crítico',
  'Segundo Plano',
  'Multimedia',
];

export const TablaProcesos = ({
  processes,
  onSelectProcess,
  selectedProcessNames = [],
  onSelectionChange,
  onAnalyzeInPolygon,
  analizandoEnPoligonoNombres = null,
  onApplyMassTag,
  procesoSeleccionado,
}) => {
  const [busqueda, setBusqueda] = useState('');

  // Filtros de visualización derivados de la selección
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [ocultarDesmarcados, setOcultarDesmarcados] = useState(false);

  // Modal / popover para asignación masiva de etiquetas
  const [mostrarModalEtiquetas, setMostrarModalEtiquetas] = useState(false);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');

  // Ordenamiento interactivo por columnas (estilo Explorador de Windows)
  const [columnaActiva, setColumnaActiva] = useState('proceso');
  const [direccionOrden, setDireccionOrden] = useState('asc');

  // Paginación estilo Gmail
  const [paginaActual, setPaginaActual] = useState(1);
  const selectAllId = useId();

  // Manejo de clic en encabezados para ordenamiento con exclusividad
  const handleHeaderClick = (columna) => {
    if (columnaActiva === columna) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaActiva(columna);
      setDireccionOrden('asc');
    }
    setPaginaActual(1);
  };

  const obtenerTriangulo = (columna) => {
    if (columnaActiva === columna) {
      return direccionOrden === 'asc' ? '▲' : '▼';
    }
    return '▲';
  };

  // Búsqueda por nombre: coincidencia parcial sin distinguir mayúsculas, se actualiza con cada refresco de la lista
  const termino = busqueda.trim().toLowerCase();
  let listaBase = termino
    ? processes.filter((p) => p.name.toLowerCase().includes(termino))
    : processes;

  // Filtro por selección (si el usuario activa "Mostrar solo seleccionados" u "Ocultar desmarcados")
  if (soloSeleccionados || ocultarDesmarcados) {
    listaBase = listaBase.filter((p) => selectedProcessNames.includes(p.name));
  }

  // Ordenamiento
  const procesosOrdenados = [...listaBase].sort((a, b) => {
    let comparacion = 0;
    if (columnaActiva === 'proceso') {
      comparacion = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else if (columnaActiva === 'etiquetas') {
      const tagA = (a.tags && a.tags[0]) || '';
      const tagB = (b.tags && b.tags[0]) || '';
      comparacion = tagA.localeCompare(tagB, undefined, { sensitivity: 'base' });
    } else if (columnaActiva === 'pids') {
      const pidA = a.pids && a.pids.length > 0 ? a.pids[0] : 0;
      const pidB = b.pids && b.pids.length > 0 ? b.pids[0] : 0;
      comparacion = pidA - pidB;
    } else if (columnaActiva === 'cpu') {
      comparacion = (a.cpu_percent || 0) - (b.cpu_percent || 0);
    } else if (columnaActiva === 'ram') {
      comparacion = (a.memory_percent || 0) - (b.memory_percent || 0);
    }
    return direccionOrden === 'asc' ? comparacion : -comparacion;
  });

  // Cálculo de paginación estilo Gmail
  const totalElementos = procesosOrdenados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / ELEMENTOS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);

  const indiceInicio = totalElementos === 0 ? 0 : (paginaValida - 1) * ELEMENTOS_POR_PAGINA;
  const indiceFin = Math.min(indiceInicio + ELEMENTOS_POR_PAGINA, totalElementos);
  const procesosAMostrar = procesosOrdenados.slice(indiceInicio, indiceFin);

  const rangoTexto =
    totalElementos === 0
      ? '0 de 0 procesos'
      : `${indiceInicio + 1}–${indiceFin} de ${totalElementos} procesos`;

  // Checkbox global: verificar si todos los procesos ordenados están seleccionados
  const todosSeleccionados =
    procesosOrdenados.length > 0 &&
    procesosOrdenados.every((p) => selectedProcessNames.includes(p.name));

  const algunosSeleccionados =
    procesosOrdenados.some((p) => selectedProcessNames.includes(p.name)) && !todosSeleccionados;

  const handleToggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (todosSeleccionados) {
      // Deseleccionar todos los visibles actualmente
      const nombresVisibles = new Set(procesosOrdenados.map((p) => p.name));
      const restantes = selectedProcessNames.filter((name) => !nombresVisibles.has(name));
      onSelectionChange(restantes);
    } else {
      // Agregar todos los procesos de la vista filtrada a la selección
      const nuevos = new Set([...selectedProcessNames, ...procesosOrdenados.map((p) => p.name)]);
      onSelectionChange(Array.from(nuevos));
    }
  };

  const handleToggleRow = (name, e) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedProcessNames.includes(name)) {
      onSelectionChange(selectedProcessNames.filter((n) => n !== name));
    } else {
      onSelectionChange([...selectedProcessNames, name]);
    }
  };

  const handleAplicarEtiquetaMasiva = (etiqueta) => {
    const cleanTag = etiqueta.trim();
    if (!cleanTag || selectedProcessNames.length === 0) return;
    if (onApplyMassTag) {
      onApplyMassTag(selectedProcessNames, cleanTag);
    }
    setNuevaEtiqueta('');
    setMostrarModalEtiquetas(false);
  };

  const cantidadSeleccionados = selectedProcessNames.length;
  const poligonofiltroActivo =
    analizandoEnPoligonoNombres &&
    analizandoEnPoligonoNombres.length > 0 &&
    analizandoEnPoligonoNombres.length === cantidadSeleccionados &&
    selectedProcessNames.every((n) => analizandoEnPoligonoNombres.includes(n));

  return (
    <div className="tabla-procesos-container">
      {/* Cabecera y buscador */}
      <div className="tabla-header-controls">
        <div>
          <h3 className="tabla-titulo">Procesos del Sistema</h3>
          <span className="tabla-subtitulo">
            {totalElementos} procesos detectados {soloSeleccionados ? '(Filtro activo)' : ''}
          </span>
        </div>

        <div className="controles-filtro">
          <input
            type="text"
            placeholder="Buscar proceso..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            className="input-busqueda"
          />
        </div>
      </div>

      {/* Barra de Acciones Contextuales basada en la Selección */}
      {cantidadSeleccionados > 0 && (
        <div className="barra-acciones-seleccion">
          <div className="seleccion-info">
            <span className="badge-seleccion-count">{cantidadSeleccionados}</span>
            <span>
              {cantidadSeleccionados === 1 ? 'proceso seleccionado' : 'procesos seleccionados'}
            </span>
          </div>

          <div className="seleccion-botones">
            {/* 1. Analizar en el polígono */}
            <button
              type="button"
              className={`btn-accion-sel ${poligonofiltroActivo ? 'activo' : ''}`}
              onClick={() => onAnalyzeInPolygon && onAnalyzeInPolygon(selectedProcessNames)}
              title="Filtrar el gráfico de recursos para mostrar únicamente los procesos seleccionados"
            >
              <span className="icono-accion">📊</span>
              <span>{poligonofiltroActivo ? 'Analizando en Polígono' : 'Analizar en Polígono'}</span>
            </button>

            {/* 2. Filtrar tabla (Mostrar solo seleccionados) */}
            <button
              type="button"
              className={`btn-accion-sel ${soloSeleccionados ? 'activo' : ''}`}
              onClick={() => {
                setSoloSeleccionados(!soloSeleccionados);
                setPaginaActual(1);
              }}
              title="Mostrar únicamente los procesos marcados en esta tabla"
            >
              <span className="icono-accion">🔍</span>
              <span>{soloSeleccionados ? 'Ver Todos' : 'Filtrar Selección'}</span>
            </button>

            {/* 3. Ocultar desmarcados */}
            <button
              type="button"
              className={`btn-accion-sel ${ocultarDesmarcados ? 'activo' : ''}`}
              onClick={() => {
                setOcultarDesmarcados(!ocultarDesmarcados);
                setPaginaActual(1);
              }}
              title="Excluir de la vista los elementos no seleccionados"
            >
              <span className="icono-accion">👁️</span>
              <span>{ocultarDesmarcados ? 'Restaurar No Marcados' : 'Ocultar Desmarcados'}</span>
            </button>

            {/* 4. Asignar etiquetas masivas */}
            <div className="contenedor-etiquetas-popover">
              <button
                type="button"
                className="btn-accion-sel"
                onClick={() => setMostrarModalEtiquetas(!mostrarModalEtiquetas)}
                title="Asignar una etiqueta común a todos los procesos seleccionados"
              >
                <span className="icono-accion">🏷️</span>
                <span>Asignar Etiquetas</span>
              </button>

              {mostrarModalEtiquetas && (
                <div className="popover-etiquetas">
                  <div className="popover-header">
                    <strong>Etiquetar {cantidadSeleccionados} procesos</strong>
                    <button
                      type="button"
                      className="btn-cerrar-popover"
                      onClick={() => setMostrarModalEtiquetas(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="popover-sugerencias">
                    <span className="subtitulo-popover">Sugerencias:</span>
                    <div className="chips-sugerencias">
                      {SUGERENCIAS_ETIQUETAS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="chip-tag-btn"
                          onClick={() => handleAplicarEtiquetaMasiva(tag)}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="popover-form">
                    <input
                      type="text"
                      placeholder="Nueva etiqueta personalizada..."
                      value={nuevaEtiqueta}
                      onChange={(e) => setNuevaEtiqueta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAplicarEtiquetaMasiva(nuevaEtiqueta);
                        }
                      }}
                      className="input-nueva-etiqueta"
                    />
                    <button
                      type="button"
                      className="btn-aplicar-etiqueta"
                      onClick={() => handleAplicarEtiquetaMasiva(nuevaEtiqueta)}
                      disabled={!nuevaEtiqueta.trim()}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Deseleccionar */}
            <button
              type="button"
              className="btn-accion-sel btn-limpiar-sel"
              onClick={() => onSelectionChange && onSelectionChange([])}
              title="Deseleccionar todos los procesos"
            >
              ✕ Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Tabla con encabezados interactivos estilo Windows Explorer */}
      <div className="tabla-scroll-wrapper">
        <table className="tabla-datos">
          <thead>
            <tr>
              {/* Columna Checkbox Todos */}
              <th className="th-checkbox">
                <label className="checkbox-custom-container" htmlFor={selectAllId}>
                  <input
                    id={selectAllId}
                    type="checkbox"
                    checked={todosSeleccionados}
                    ref={(el) => {
                      if (el) el.indeterminate = algunosSeleccionados;
                    }}
                    onChange={handleToggleSelectAll}
                    title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  />
                  <span className="checkbox-checkmark"></span>
                </label>
              </th>

              {/* Columna Proceso */}
              <th
                onClick={() => handleHeaderClick('proceso')}
                className={`th-ordenable ${columnaActiva === 'proceso' ? 'columna-activa' : ''}`}
                title="Ordenar por Proceso"
              >
                <div className="th-contenido">
                  <span className="th-titulo">Proceso</span>
                  <span className="indicador-triangulo">{obtenerTriangulo('proceso')}</span>
                </div>
              </th>

              {/* Columna Etiquetas */}
              <th
                onClick={() => handleHeaderClick('etiquetas')}
                className={`th-ordenable ${columnaActiva === 'etiquetas' ? 'columna-activa' : ''}`}
                title="Ordenar por Etiquetas"
              >
                <div className="th-contenido">
                  <span className="th-titulo">Etiquetas</span>
                  <span className="indicador-triangulo">{obtenerTriangulo('etiquetas')}</span>
                </div>
              </th>

              {/* Columna PIDs */}
              <th
                onClick={() => handleHeaderClick('pids')}
                className={`th-ordenable ${columnaActiva === 'pids' ? 'columna-activa' : ''}`}
                title="Ordenar por PIDs"
              >
                <div className="th-contenido">
                  <span className="th-titulo">PIDs</span>
                  <span className="indicador-triangulo">{obtenerTriangulo('pids')}</span>
                </div>
              </th>

              {/* Columna CPU */}
              <th
                onClick={() => handleHeaderClick('cpu')}
                className={`th-ordenable th-align-right ${columnaActiva === 'cpu' ? 'columna-activa' : ''}`}
                title="Ordenar por CPU"
              >
                <div className="th-contenido th-content-right">
                  <span className="th-titulo">CPU</span>
                  <span className="indicador-triangulo">{obtenerTriangulo('cpu')}</span>
                </div>
              </th>

              {/* Columna RAM */}
              <th
                onClick={() => handleHeaderClick('ram')}
                className={`th-ordenable th-align-right ${columnaActiva === 'ram' ? 'columna-activa' : ''}`}
                title="Ordenar por RAM"
              >
                <div className="th-contenido th-content-right">
                  <span className="th-titulo">RAM</span>
                  <span className="indicador-triangulo">{obtenerTriangulo('ram')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {procesosAMostrar.length > 0 ? (
              procesosAMostrar.map((proc, index) => {
                const estaSeleccionado = selectedProcessNames.includes(proc.name);
                const esInspeccionado = procesoSeleccionado?.name === proc.name;

                return (
                  <tr
                    key={`${proc.name}-${index}`}
                    onClick={() => onSelectProcess(proc)}
                    className={`fila-proceso ${estaSeleccionado ? 'fila-seleccionada' : ''} ${
                      esInspeccionado ? 'fila-inspeccionada' : ''
                    }`}
                  >
                    {/* Checkbox Individual */}
                    <td
                      className="td-checkbox"
                      onClick={(e) => handleToggleRow(proc.name, e)}
                    >
                      <label className="checkbox-custom-container" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={estaSeleccionado}
                          onChange={(e) => handleToggleRow(proc.name, e)}
                        />
                        <span className="checkbox-checkmark"></span>
                      </label>
                    </td>

                    {/* Nombre */}
                    <td className="nombre-proceso">
                      <div className="nombre-con-indicador">
                        {proc.name}
                        {analizandoEnPoligonoNombres?.includes(proc.name) && (
                          <span
                            className="badge-en-analisis"
                            title="Incluido en el análisis activo del polígono"
                          >
                            📈 En Polígono
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Etiquetas */}
                    <td className="td-etiquetas">
                      <div className="tags-container">
                        {proc.tags && proc.tags.length > 0 ? (
                          proc.tags.map((tag) => (
                            <span key={tag} className="badge-etiqueta">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="sin-etiquetas">—</span>
                        )}
                      </div>
                    </td>

                    {/* PIDs */}
                    <td className="pids-proceso">
                      {proc.pids && proc.pids.length > 0 ? proc.pids.join(', ') : 'N/A'}
                    </td>

                    {/* CPU */}
                    <td className="cpu-proceso text-right">{proc.cpu_percent}%</td>

                    {/* RAM */}
                    <td className="ram-proceso text-right">{proc.memory_percent}%</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="sin-resultados">
                  {busqueda
                    ? `No se encontró ningún proceso que contenga "${busqueda}"`
                    : soloSeleccionados
                    ? 'No hay procesos seleccionados en este momento'
                    : 'No hay procesos disponibles'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación interactiva estilo Gmail */}
      <div className="paginacion-gmail">
        <div className="paginacion-info">
          <span className="paginacion-rango">{rangoTexto}</span>
          <span className="paginacion-pagina-actual">
            (Página {paginaValida} de {totalPaginas})
          </span>
        </div>

        <div className="paginacion-controles">
          <button
            type="button"
            className="btn-pag-nav"
            disabled={paginaValida <= 1}
            onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
            title="Página anterior"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="btn-pag-nav"
            disabled={paginaValida >= totalPaginas || totalElementos === 0}
            onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
            title="Página siguiente"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

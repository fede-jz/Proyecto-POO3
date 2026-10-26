import React from 'react';

export const MenuExportacion = ({
  hoyStr,
  fechaInicio,
  fechaFin,
  handleCambioFechaInicio,
  handleCambioFechaFin,
  filtroSeveridadExport,
  setFiltroSeveridadExport,
  handleExportarGraficoPdf,
  handleExportarGraficoSvg,
  handleExportarGraficoPng,
  handleExportarProcesosExcel,
  handleExportarProcesosPdf,
  handleExportarAlertasCsv,
  handleExportarAlertasPdf,
  handleInformeGeneralCompleto,
  procesos,
  alertas
}) => {
  return (
    <div className="modulo-exportacion-container">
      <div className="export-intro-card">
        <h4>Centro de Exportación de Datos e Informes</h4>
        <p>Descarga telemetría y bitácoras para auditoría técnica.</p>
      </div>

      <div className="card-informe-completo">
        <div className="informe-completo-info">
          <h5>📑 Informe Ejecutivo General Completo</h5>
          <p>Consolida métricas globales y top de procesos.</p>
        </div>
        <button type="button" className="btn-descarga-destacado" onClick={handleInformeGeneralCompleto}>
          Generar Informe PDF Completo
        </button>
      </div>

      {/* Gráficos */}
      <div className="card-export-grupo">
        <div className="grupo-header">
          <span className="grupo-icono">📈</span>
          <div className="grupo-textos">
            <h5>Exportar Gráficos de Consumo</h5>
          </div>
        </div>
        <div className="rango-fechas-grid">
          <div className="campo-fecha">
            <label>Desde:</label>
            <input type="date" value={fechaInicio} max={hoyStr} onChange={(e) => handleCambioFechaInicio(e.target.value)} className="input-fecha" />
          </div>
          <div className="campo-fecha">
            <label>Hasta:</label>
            <input type="date" value={fechaFin} max={hoyStr} onChange={(e) => handleCambioFechaFin(e.target.value)} className="input-fecha" />
          </div>
        </div>
        <div className="botones-descarga-fila">
          <button type="button" className="btn-formato btn-pdf" onClick={handleExportarGraficoPdf}>PDF</button>
          <button type="button" className="btn-formato btn-svg" onClick={handleExportarGraficoSvg}>SVG</button>
          <button type="button" className="btn-formato btn-png" onClick={handleExportarGraficoPng}>PNG</button>
        </div>
      </div>

      {/* Procesos */}
      <div className="card-export-grupo">
        <div className="grupo-header">
          <span className="grupo-icono">⚡</span>
          <div className="grupo-textos">
            <h5>Exportar Inventario de Procesos</h5>
          </div>
        </div>
        <div className="botones-descarga-fila">
          <button type="button" className="btn-formato btn-excel" onClick={handleExportarProcesosExcel}>Excel (CSV)</button>
          <button type="button" className="btn-formato btn-pdf" onClick={handleExportarProcesosPdf}>PDF</button>
        </div>
      </div>

      {/* Alertas */}
      <div className="card-export-grupo">
        <div className="grupo-header">
          <span className="grupo-icono">🔔</span>
          <div className="grupo-textos">
            <h5>Exportar Registro de Alertas</h5>
          </div>
        </div>
        <div className="filtro-severidad-export">
          <label>Severidad:</label>
          <select value={filtroSeveridadExport} onChange={(e) => setFiltroSeveridadExport(e.target.value)} className="select-export-filtro">
            <option value="todas">Todas</option>
            <option value="crítico">Críticas</option>
            <option value="alto">Altas</option>
          </select>
        </div>
        <div className="botones-descarga-fila">
          <button type="button" className="btn-formato btn-excel" onClick={handleExportarAlertasCsv}>Excel/CSV</button>
          <button type="button" className="btn-formato btn-pdf" onClick={handleExportarAlertasPdf}>PDF</button>
        </div>
      </div>
    </div>
  );
};
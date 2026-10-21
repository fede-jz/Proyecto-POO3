import React, { useState } from 'react';
import { buscarProcesoPorNombre } from '../../services/procesos'; 
import './TablaProcesos.css';

export function TablaProcesos({ processes = [], onSelectProcess, procesoSeleccionado }) {
  const [busqueda, setBusqueda] = useState('');
  const [criterioOrden, setCriterioOrden] = useState('cpu'); // 'cpu' | 'ram' | 'nombre'
  const [procesosFiltradosApi, setProcesosFiltradosApi] = useState(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      const termino = busqueda.trim();
      
      if (!termino) {
        setProcesosFiltradosApi(null);
        return;
      }

      setCargandoBusqueda(true);
      const resultado = await buscarProcesoPorNombre(termino);
      
      if (resultado.success) {
        setProcesosFiltradosApi(resultado.data); 
      } else {
        setProcesosFiltradosApi([]); 
      }
      setCargandoBusqueda(false);
    }
  };

  const listaBase = procesosFiltradosApi !== null ? procesosFiltradosApi : processes;

  const procesosOrdenados = [...listaBase].sort((a, b) => { 
    if (criterioOrden === 'cpu') return b.cpu_percent - a.cpu_percent; 
    if (criterioOrden === 'ram') return b.memory_percent - a.memory_percent; 
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="tabla-procesos-container">
      <div className="tabla-header-controls">
        <h3 className="tabla-titulo">
          Procesos del Sistema ({procesosOrdenados.length})
        </h3>
        
        <div className="controles-filtro">
          <input 
            type="text" 
            placeholder="Buscar exacto + Enter..." 
            value={busqueda}
            onChange={(e) => {
              const nuevoValor = e.target.value;
              setBusqueda(nuevoValor);
              if (nuevoValor.trim() === '') {
                setProcesosFiltradosApi(null);
              }
            }}
            onKeyDown={handleKeyDown}
            className="input-busqueda"
          />
          <select 
            value={criterioOrden} 
            onChange={(e) => setCriterioOrden(e.target.value)}
            className="select-orden"
          >
            <option value="cpu">Más CPU</option>
            <option value="ram">Más RAM</option>
            <option value="nombre">Alfabeto</option>
          </select>
        </div>
      </div>

      {/* Vista de 12 filas con scroll continuo directo */}
      <div className="tabla-scroll-wrapper">
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Proceso</th>
              <th>PIDs</th>
              <th className="text-right">CPU</th>
              <th className="text-right">RAM</th>
            </tr>
          </thead>
          <tbody>
            {cargandoBusqueda ? (
              <tr>
                <td colSpan="4" className="sin-resultados">Buscando proceso...</td>
              </tr>
            ) : procesosOrdenados.length > 0 ? (
              procesosOrdenados.map((proc, index) => {
                // Comprobación flexible de coincidencia por nombre o por PID
                const nombreSel = procesoSeleccionado?.name || procesoSeleccionado?.nombre;
                const nombreProc = proc.name || proc.nombre;

                const esSeleccionado = Boolean(
                  procesoSeleccionado && (
                    (nombreSel && nombreProc && nombreSel.toLowerCase() === nombreProc.toLowerCase()) ||
                    (procesoSeleccionado.pid && proc.pid && procesoSeleccionado.pid === proc.pid)
                  )
                );

                return (
                  <tr 
                    key={proc.pid || index} 
                    onClick={() => onSelectProcess(proc)}
                    className={`fila-proceso ${esSeleccionado ? 'seleccionada' : ''}`}
                  >
                    <td className="nombre-proceso">{proc.name || proc.nombre}</td>
                    <td className="pids-proceso">
                      {proc.pids ? proc.pids.join(', ') : (proc.pid || 'N/A')}
                    </td>
                    <td className="cpu-proceso text-right">{proc.cpu_percent}%</td>
                    <td className="ram-proceso text-right">{proc.memory_percent}%</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="sin-resultados">
                  {busqueda ? `No se encontró el proceso exacto "${busqueda}"` : 'No hay procesos disponibles'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
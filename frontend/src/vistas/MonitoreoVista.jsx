import { useState } from 'react';
import { TarjetaMetrica } from '../componentes/TarjetaMetrica/TarjetaMetrica';
import { TablaProcesos } from '../componentes/TablaProcesos/TablaProcesos';
import { GraficoIndividual } from '../componentes/GraficoIndividual/GraficoIndividual'; 
import { PoligonoRecursos } from '../componentes/PoligonoRecursos/PoligonoRecursos';
import './MonitoreoVista.css';

export const MonitoreoVista = ({
  procesos,
  totalProcesosAgrupados,
  cpuTotal,
  ramTotal,
  horaServidor,
  historialMuestras
}) => {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  // Umbrales visuales
  const [umbralAdvertencia] = useState(80);
  const [umbralCritico] = useState(90);

  return (
    <main className="main-content">
      <section className="metrics-grid">
        <TarjetaMetrica title="CPU Total Usado" value={cpuTotal} unit="%" subtitle="" />
        <TarjetaMetrica title="Memoria RAM Usada" value={ramTotal} unit="%" subtitle="" />
        <TarjetaMetrica title="Procesos Únicos" value={totalProcesosAgrupados} subtitle={`Actualizado: ${horaServidor}`} />
      </section>

      <div className={`dashboard-layout-desplegable ${sidebarAbierto ? 'con-sidebar' : 'sin-sidebar'}`}>
        <div className="columna-tabla">
          <TablaProcesos 
            processes={procesos} 
            procesoSeleccionado={procesoSeleccionado}
            onSelectProcess={(proc) => setProcesoSeleccionado(proc)} 
          />
        </div>

        <div className="wrapper-sidebar-lateral">
          <button 
            className="lengueta-desplegable" 
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            title={sidebarAbierto ? "Ocultar panel" : "Mostrar panel y gráficos"}
          >
            {sidebarAbierto ? '›' : '‹'}
          </button>

          {sidebarAbierto && (
            <aside className="columna-paneles-derecha">
              <PoligonoRecursos 
                historial={historialMuestras} 
                umbralAdvertencia={umbralAdvertencia}
                umbralCritico={umbralCritico}
              />
              <GraficoIndividual proceso={procesoSeleccionado} />
            </aside>
          )}
        </div>
      </div>
    </main>
  );
};
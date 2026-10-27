import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '../componentes/Navbar/Navbar';
import { TarjetaMetrica } from '../componentes/TarjetaMetrica/TarjetaMetrica';
import { TablaProcesos } from '../componentes/TablaProcesos/TablaProcesos';
import { TablaAlertas } from '../componentes/TablaAlertas/TablaAlertas';
import { MenuAjustes } from '../componentes/MenuAjustes/MenuAjustes';
import { obtenerDatosYMetricas } from '../controladores/gestorProcesos';
import { GraficoIndividual } from '../componentes/GraficoIndividual/GraficoIndividual';
import { PoligonoRecursos } from '../componentes/PoligonoRecursos/PoligonoRecursos';
import { getStoredTags, saveStoredTags } from '../services/procesos';
import { obtenerDatosAlertas, reconocerAlertaService, eliminarEventoService } from '../services/alertas';
import './Dashboard.css';

export function Dashboard({ usuario, onCerrarSesion, onActualizarUsuario }) {
  const [procesos, setProcesos] = useState([]);
  const [estadoBackend, setEstadoBackend] = useState('CONECTANDO...');
  const [totalProcesosAgrupados, setTotalProcesosAgrupados] = useState(0);
  const [cpuTotal, setCpuTotal] = useState('0.0');
  const [ramTotal, setRamTotal] = useState('0.0');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [horaServidor, setHoraServidor] = useState('');
  const [historialMuestras, setHistorialMuestras] = useState([]);

  const [vistaActiva, setVistaActiva] = useState('procesos');
  const [menuAjustesAbierto, setMenuAjustesAbierto] = useState(false);
  
  // Alertas dinámicas desde el backend de Supabase
  const [alertas, setAlertas] = useState([]);
  const [reglasAlertas, setReglasAlertas] = useState([]);

  const [selectedProcessNames, setSelectedProcessNames] = useState([]);

  const [polygonFilteredNames, setPolygonFilteredNames] = useState(null);
  const polygonFilteredRef = useRef(null);
  polygonFilteredRef.current = polygonFilteredNames;

  const [tagsMap, setTagsMap] = useState(() => getStoredTags());
  const tagsMapRef = useRef(tagsMap);
  tagsMapRef.current = tagsMap;

  const [umbralAdvertencia] = useState(80);
  const [umbralCritico] = useState(90);

  // Función para obtener los eventos y reglas reales del servidor
  const cargarAlertasReales = useCallback(async () => {
    const resultado = await obtenerDatosAlertas();
    if (resultado.success) {
      setAlertas(resultado.eventos);
      setReglasAlertas(resultado.reglas);
    }
  }, []);

  const actualizarInformacion = useCallback(async () => {
    const datos = await obtenerDatosYMetricas();
    const currentTags = tagsMapRef.current;

    const procesosConEtiquetas = datos.procesos.map((p) => ({
      ...p,
      tags: currentTags[p.name] || [],
    }));

    setProcesos(procesosConEtiquetas);
    setEstadoBackend(datos.estadoBackend);
    setTotalProcesosAgrupados(datos.totalProcesosAgrupados);
    setCpuTotal(datos.cpuTotal);
    setRamTotal(datos.ramTotal);

    setProcesoSeleccionado((prev) => {
      if (!prev) return null;
      const matched = procesosConEtiquetas.find((p) => p.name === prev.name);
      return matched || prev;
    });

    const filtroActivo = polygonFilteredRef.current;
    let cpuNum;
    let ramNum;

    if (filtroActivo && filtroActivo.length > 0) {
      const procesosFiltrados = procesosConEtiquetas.filter((p) => filtroActivo.includes(p.name));
      const cpuSum = procesosFiltrados.reduce((acc, p) => acc + (p.cpu_percent || 0), 0);
      const ramSum = procesosFiltrados.reduce((acc, p) => acc + (p.memory_percent || 0), 0);
      cpuNum = Number(cpuSum.toFixed(1));
      ramNum = Number(ramSum.toFixed(1));
    } else {
      cpuNum = parseFloat(datos.cpuTotal) || 0;
      ramNum = parseFloat(datos.ramTotal) || 0;
    }

    const timestampActual = new Date().toLocaleTimeString();

    setHistorialMuestras((prev) => {
      const nuevaMuestra = { time: timestampActual, cpu: cpuNum, ram: ramNum };
      const actualizado = [...prev, nuevaMuestra];
      if (actualizado.length > 30) {
        actualizado.shift();
      }
      return actualizado;
    });
  }, []);

  useEffect(() => {
    actualizarInformacion();
    cargarAlertasReales();

    const intervaloDatos = setInterval(actualizarInformacion, 5000);
    const intervaloAlertas = setInterval(cargarAlertasReales, 15000);

    const actualizarReloj = () => {
      const ahora = new Date();
      setHoraServidor(ahora.toLocaleTimeString());
    };
    actualizarReloj();
    const intervaloReloj = setInterval(actualizarReloj, 1000);

    return () => {
      clearInterval(intervaloDatos);
      clearInterval(intervaloAlertas);
      clearInterval(intervaloReloj);
    };
  }, [actualizarInformacion, cargarAlertasReales]);

  const handleAnalyzeInPolygon = (processNames) => {
    if (!processNames || processNames.length === 0) {
      setPolygonFilteredNames(null);
      return;
    }

    if (
      polygonFilteredNames &&
      polygonFilteredNames.length === processNames.length &&
      processNames.every((n) => polygonFilteredNames.includes(n))
    ) {
      setPolygonFilteredNames(null);
    } else {
      setPolygonFilteredNames([...processNames]);
    }
  };

  const handleResetPolygonFilter = () => {
    setPolygonFilteredNames(null);
  };

  const handleApplyMassTag = (processNames, tag) => {
    const updatedMap = { ...tagsMapRef.current };
    processNames.forEach((name) => {
      const existing = updatedMap[name] || [];
      if (!existing.includes(tag)) {
        updatedMap[name] = [...existing, tag];
      }
    });

    saveStoredTags(updatedMap);
    setTagsMap(updatedMap);

    setProcesos((prev) =>
      prev.map((p) => (processNames.includes(p.name) ? { ...p, tags: updatedMap[p.name] } : p))
    );
  };

  const handleAddTagToProcess = (processName, tag) => {
    const updatedMap = { ...tagsMapRef.current };
    const existing = updatedMap[processName] || [];
    if (!existing.includes(tag)) {
      updatedMap[processName] = [...existing, tag];
      saveStoredTags(updatedMap);
      setTagsMap(updatedMap);

      setProcesos((prev) =>
        prev.map((p) => (p.name === processName ? { ...p, tags: updatedMap[processName] } : p))
      );
    }
  };

  const handleRemoveTagFromProcess = (processName, tag) => {
    const updatedMap = { ...tagsMapRef.current };
    const existing = updatedMap[processName] || [];
    updatedMap[processName] = existing.filter((t) => t !== tag);
    saveStoredTags(updatedMap);
    setTagsMap(updatedMap);

    setProcesos((prev) =>
      prev.map((p) => (p.name === processName ? { ...p, tags: updatedMap[processName] } : p))
    );
  };

  const handleActualizarAlerta = (alertaActualizada) => {
    const actualizadas = alertas.map((a) => (a.id === alertaActualizada.id ? alertaActualizada : a));
    setAlertas(actualizadas);
  };

  const handleMarcarReconocidas = async (ids) => {
    for (const idFormateado of ids) {
      const alertaEncontrada = alertas.find((a) => a.id === idFormateado);
      if (alertaEncontrada && alertaEncontrada.eventoId) {
        await reconocerAlertaService(alertaEncontrada.eventoId);
      }
    }
    cargarAlertasReales();
  };

 const handleEliminarAlerta = async (eventoId) => {
    const res = await eliminarEventoService(eventoId);
    if (res.success) {
      cargarAlertasReales();
    } else {
      alert(res.mensaje || "No tienes permisos de Administrador para eliminar esta alerta.");
    }
  };

  const conteoAlertasNoReconocidas = alertas.filter((a) => a.estadoEntrega === 'No reconocido').length;
const esAdministrador = usuario?.rol === 'Administrador';
  return (
    <div className="app-container">
      <Navbar
        status={estadoBackend}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        onAbrirAjustes={() => setMenuAjustesAbierto(true)}
        conteoAlertasNoReconocidas={conteoAlertasNoReconocidas}
      />

      <div className="pm-user-bar">
        <span className="pm-user-info">
          Sesión activa: <strong className="pm-user-highlight">{usuario?.nombre || usuario?.email}</strong>
        </span>
        <button onClick={onCerrarSesion} className="pm-btn-logout">
          Cerrar sesión
        </button>
      </div>
      <main className="main-content">
        {vistaActiva === 'procesos' && (
          <>
            <section className="metrics-grid">
              <TarjetaMetrica title="CPU Total Usado" value={cpuTotal} unit="%" subtitle="" />
              <TarjetaMetrica title="Memoria RAM Usada" value={ramTotal} unit="%" subtitle="" />
              <TarjetaMetrica
                title="Procesos Únicos"
                value={totalProcesosAgrupados}
                subtitle={`Actualizado: ${horaServidor}`}
              />
            </section>

            <div className={`dashboard-layout-desplegable ${sidebarAbierto ? 'con-sidebar' : 'sin-sidebar'}`}>
              <div className="columna-tabla">
                <TablaProcesos
                  processes={procesos}
                  onSelectProcess={(proc) => setProcesoSeleccionado(proc)}
                  selectedProcessNames={selectedProcessNames}
                  onSelectionChange={setSelectedProcessNames}
                  onAnalyzeInPolygon={handleAnalyzeInPolygon}
                  analizandoEnPoligonoNombres={polygonFilteredNames}
                  onApplyMassTag={handleApplyMassTag}
                  procesoSeleccionado={procesoSeleccionado}
                />
              </div>

              <div className="wrapper-sidebar-lateral">
                <button
                  className="lengueta-desplegable"
                  onClick={() => setSidebarAbierto(!sidebarAbierto)}
                  title={sidebarAbierto ? 'Ocultar panel' : 'Mostrar panel y gráficos'}
                >
                  {sidebarAbierto ? '›' : '‹'}
                </button>

                {sidebarAbierto && (
                  <aside className="columna-paneles-derecha">
                    <PoligonoRecursos
                      historial={historialMuestras}
                      umbralAdvertencia={umbralAdvertencia}
                      umbralCritico={umbralCritico}
                      filtroProcesosNombres={polygonFilteredNames}
                      onRestablecerFiltro={handleResetPolygonFilter}
                    />
                    <GraficoIndividual
                      proceso={procesoSeleccionado}
                      onAddTag={handleAddTagToProcess}
                      onRemoveTag={handleRemoveTagFromProcess}
                    />
                  </aside>
                )}
              </div>
            </div>
          </>
        )}

      {vistaActiva === 'alertas' && (
          <TablaAlertas
            alertas={alertas}
            onActualizarAlerta={handleActualizarAlerta}
            onMarcarReconocidas={handleMarcarReconocidas}
            onEliminarAlerta={handleEliminarAlerta}
            esAdmin={esAdministrador}
          />
        )}
      </main>

      <MenuAjustes
        abierto={menuAjustesAbierto}
        onCerrar={() => setMenuAjustesAbierto(false)}
        procesos={procesos}
        onActualizarUsuario={onActualizarUsuario}
        reglasAlertas={reglasAlertas}
        cpuTotal={cpuTotal}
        ramTotal={ramTotal}
        usuario={usuario}
      />
    </div>
  );
}

export default Dashboard;
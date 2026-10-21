import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './componentes/Navbar/Navbar';
import { TarjetaMetrica } from './componentes/TarjetaMetrica/TarjetaMetrica';
import { TablaProcesos } from './componentes/TablaProcesos/TablaProcesos';
import { TablaAlertas } from './componentes/TablaAlertas/TablaAlertas';
import { MenuAjustes } from './componentes/MenuAjustes/MenuAjustes';
import { obtenerDatosYMetricas } from './controladores/gestorProcesos';
import { GraficoIndividual } from './componentes/GraficoIndividual/GraficoIndividual';
import { PoligonoRecursos } from './componentes/PoligonoRecursos/PoligonoRecursos';
import { getStoredTags, saveStoredTags } from './services/procesos';
import { getStoredAlertas, saveStoredAlertas } from './services/alertas';
import { Process, MetricSample, AlertaSistema, VistaActiva } from './types';

export function App() {
  const [procesos, setProcesos] = useState<Process[]>([]);
  const [estadoBackend, setEstadoBackend] = useState('CONECTANDO...');
  const [totalProcesosAgrupados, setTotalProcesosAgrupados] = useState(0);
  const [cpuTotal, setCpuTotal] = useState('0.0');
  const [ramTotal, setRamTotal] = useState('0.0');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Process | null>(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [horaServidor, setHoraServidor] = useState('');
  const [historialMuestras, setHistorialMuestras] = useState<MetricSample[]>([]);

  // Navegación por pestañas: 'procesos' | 'alertas'
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('procesos');

  // Menú lateral de Ajustes / Exportación (Drawer)
  const [menuAjustesAbierto, setMenuAjustesAbierto] = useState(false);

  // Alertas del Sistema
  const [alertas, setAlertas] = useState<AlertaSistema[]>(() => getStoredAlertas());

  // Selección múltiple de procesos en la tabla
  const [selectedProcessNames, setSelectedProcessNames] = useState<string[]>([]);

  // Filtro de procesos para análisis exclusivo en el Polígono
  const [polygonFilteredNames, setPolygonFilteredNames] = useState<string[] | null>(null);
  const polygonFilteredRef = useRef<string[] | null>(null);
  polygonFilteredRef.current = polygonFilteredNames;

  // Mapa global de etiquetas por proceso
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>(() => getStoredTags());
  const tagsMapRef = useRef(tagsMap);
  tagsMapRef.current = tagsMap;

  // Umbrales configurables (Advertencia y Crítico)
  const [umbralAdvertencia] = useState(80);
  const [umbralCritico] = useState(90);

  const actualizarInformacion = useCallback(async () => {
    const datos = await obtenerDatosYMetricas();
    const currentTags = tagsMapRef.current;

    // Vincular etiquetas actuales con la lista de procesos
    const procesosConEtiquetas: Process[] = datos.procesos.map((p) => ({
      ...p,
      tags: currentTags[p.name] || [],
    }));

    setProcesos(procesosConEtiquetas);
    setEstadoBackend(datos.estadoBackend);
    setTotalProcesosAgrupados(datos.totalProcesosAgrupados);
    setCpuTotal(datos.cpuTotal);
    setRamTotal(datos.ramTotal);

    // Mantener actualizado el proceso seleccionado para inspección
    setProcesoSeleccionado((prev) => {
      if (!prev) return null;
      const matched = procesosConEtiquetas.find((p) => p.name === prev.name);
      return matched || prev;
    });

    // Calcular valores de CPU y RAM para el polígono
    const filtroActivo = polygonFilteredRef.current;
    let cpuNum: number;
    let ramNum: number;

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

    // Agregar nueva muestra al historial, manteniendo un máximo de 30 muestras
    setHistorialMuestras((prev) => {
      const nuevaMuestra: MetricSample = { time: timestampActual, cpu: cpuNum, ram: ramNum };
      const actualizado = [...prev, nuevaMuestra];
      if (actualizado.length > 30) {
        actualizado.shift();
      }
      return actualizado;
    });
  }, []);

  useEffect(() => {
    actualizarInformacion();
    const intervaloDatos = setInterval(actualizarInformacion, 5000);

    const actualizarReloj = () => {
      const ahora = new Date();
      setHoraServidor(ahora.toLocaleTimeString());
    };
    actualizarReloj();
    const intervaloReloj = setInterval(actualizarReloj, 1000);

    return () => {
      clearInterval(intervaloDatos);
      clearInterval(intervaloReloj);
    };
  }, [actualizarInformacion]);

  // Acción: Enviar procesos seleccionados al polígono para análisis exclusivo
  const handleAnalyzeInPolygon = (processNames: string[]) => {
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

  // Asignar etiqueta masiva a múltiples procesos seleccionados
  const handleApplyMassTag = (processNames: string[], tag: string) => {
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

    if (procesoSeleccionado && processNames.includes(procesoSeleccionado.name)) {
      setProcesoSeleccionado((prev) =>
        prev ? { ...prev, tags: updatedMap[prev.name] || [] } : null
      );
    }
  };

  // Agregar etiqueta individual desde Inspección de Proceso
  const handleAddTagToProcess = (processName: string, tag: string) => {
    const updatedMap = { ...tagsMapRef.current };
    const existing = updatedMap[processName] || [];
    if (!existing.includes(tag)) {
      updatedMap[processName] = [...existing, tag];
      saveStoredTags(updatedMap);
      setTagsMap(updatedMap);

      setProcesos((prev) =>
        prev.map((p) => (p.name === processName ? { ...p, tags: updatedMap[processName] } : p))
      );

      setProcesoSeleccionado((prev) =>
        prev && prev.name === processName ? { ...prev, tags: updatedMap[processName] } : prev
      );
    }
  };

  // Eliminar etiqueta individual desde Inspección de Proceso
  const handleRemoveTagFromProcess = (processName: string, tag: string) => {
    const updatedMap = { ...tagsMapRef.current };
    const existing = updatedMap[processName] || [];
    updatedMap[processName] = existing.filter((t) => t !== tag);
    saveStoredTags(updatedMap);
    setTagsMap(updatedMap);

    setProcesos((prev) =>
      prev.map((p) => (p.name === processName ? { ...p, tags: updatedMap[processName] } : p))
    );

    setProcesoSeleccionado((prev) =>
      prev && prev.name === processName ? { ...prev, tags: updatedMap[processName] } : prev
    );
  };

  // Gestión de Alertas
  const handleActualizarAlerta = (alertaActualizada: AlertaSistema) => {
    const actualizadas = alertas.map((a) => (a.id === alertaActualizada.id ? alertaActualizada : a));
    setAlertas(actualizadas);
    saveStoredAlertas(actualizadas);
  };

  const handleMarcarReconocidas = (ids: string[]) => {
    const actualizadas = alertas.map((a) =>
      ids.includes(a.id) ? { ...a, estadoEntrega: 'Reconocido' as const } : a
    );
    setAlertas(actualizadas);
    saveStoredAlertas(actualizadas);
  };

  // Conteo de alertas sin reconocer para la badge de la Navbar
  const conteoAlertasNoReconocidas = alertas.filter((a) => a.estadoEntrega === 'No reconocido').length;

  return (
    <div className="app-container">
      {/* Barra de Navegación con pestañas Procesos / Alertas y botón Ajustes */}
      <Navbar
        status={estadoBackend}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        onAbrirAjustes={() => setMenuAjustesAbierto(true)}
        conteoAlertasNoReconocidas={conteoAlertasNoReconocidas}
      />

      <main className="main-content">
        {/* VISTA 1: PROCESOS Y TELEMETRÍA (DASHBOARD PRINCIPAL) */}
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

        {/* VISTA 2: GESTIÓN DE ALERTAS DEL SISTEMA */}
        {vistaActiva === 'alertas' && (
          <TablaAlertas
            alertas={alertas}
            onActualizarAlerta={handleActualizarAlerta}
            onMarcarReconocidas={handleMarcarReconocidas}
          />
        )}
      </main>

      {/* Menú Lateral de Ajustes / Configuración & Módulo de Exportación */}
      <MenuAjustes
        abierto={menuAjustesAbierto}
        onCerrar={() => setMenuAjustesAbierto(false)}
        procesos={procesos}
        alertas={alertas}
        cpuTotal={cpuTotal}
        ramTotal={ramTotal}
      />
    </div>
  );
}

export default App;

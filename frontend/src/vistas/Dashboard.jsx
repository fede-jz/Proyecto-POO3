import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '../componentes/Navbar/Navbar';
import { TarjetaMetrica } from '../componentes/TarjetaMetrica/TarjetaMetrica';
import { TablaProcesos } from '../componentes/TablaProcesos/TablaProcesos';
import { TablaAlertas } from '../componentes/TablaAlertas/TablaAlertas';
import { MenuAjustes } from '../componentes/MenuAjustes/MenuAjustes';
import { obtenerDatosYMetricas } from '../controladores/gestorProcesos';
import { PanelProceso } from '../componentes/PanelProceso/PanelProceso';
import { PoligonoRecursos } from '../componentes/PoligonoRecursos/PoligonoRecursos';
import {
  getStoredTags,
  saveStoredTags,
  listarMonitoreadosService,
  monitorearProcesoService,
  dejarDeMonitorearService,
  normalizarNombreProceso
} from '../services/procesos';
import { 
  obtenerMisUmbralesService, 
  obtenerDatosAlertas, 
  reconocerAlertaService,
  eliminarEventoService,
  listarReglasService,
  crearAlertaProcesoService,
  actualizarReglaService,
  eliminarReglaService
} from '../services/alertas';
import './Dashboard.css';

export function Dashboard({ usuario, onCerrarSesion, onActualizarUsuario }) {
  const [procesos, setProcesos] = useState([]);
  const [estadoBackend, setEstadoBackend] = useState('CONECTANDO...');
  const [totalProcesosAgrupados, setTotalProcesosAgrupados] = useState(0);
  const [cpuTotal, setCpuTotal] = useState('0.0');
  const [ramTotal, setRamTotal] = useState('0.0');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  // Gráfico ampliado de las tarjetas de CPU/RAM: null (cerrado), 'cpu' o 'ram'
  const [graficoAmpliado, setGraficoAmpliado] = useState(null);
  const [horaServidor, setHoraServidor] = useState('');
  const [historialMuestras, setHistorialMuestras] = useState([]);

  const [vistaActiva, setVistaActiva] = useState('procesos');
  const [menuAjustesAbierto, setMenuAjustesAbierto] = useState(false);
  
  // Alertas dinámicas desde el backend de Supabase
  const [alertas, setAlertas] = useState([]);
  const [reglasAlertas, setReglasAlertas] = useState([]);

  // Procesos monitoreados (los guardados en la base, a los que se les guarda historial)
  const [procesosMonitoreados, setProcesosMonitoreados] = useState([]);

  const [selectedProcessNames, setSelectedProcessNames] = useState([]);

  const [polygonFilteredNames, setPolygonFilteredNames] = useState(null);
  const polygonFilteredRef = useRef(null);
  polygonFilteredRef.current = polygonFilteredNames;

  const [tagsMap, setTagsMap] = useState(() => getStoredTags());
  const tagsMapRef = useRef(tagsMap);
  tagsMapRef.current = tagsMap;

  // Umbrales globales del servidor: cada tarjeta muestra el suyo (null = no hay alerta global de ese tipo)
  const [umbralCpu, setUmbralCpu] = useState(null);
  const [umbralRam, setUmbralRam] = useState(null);

  // Cargar los umbrales globales al iniciar el dashboard
  useEffect(() => {
    async function cargarUmbralesGlobales() {
      const umbrales = await obtenerMisUmbralesService();
      if (umbrales) {
        setUmbralCpu(umbrales.cpu ?? null);
        setUmbralRam(umbrales.ram ?? null);
      }
    }
    cargarUmbralesGlobales();
  }, []);

  // Al guardar los umbrales en Ajustes se actualizan las líneas de las tarjetas
  const handleUmbralesActualizados = (nuevosUmbrales) => {
    setUmbralCpu(nuevosUmbrales.cpu);
    setUmbralRam(nuevosUmbrales.ram);
  };

  // Función para obtener los eventos y reglas reales del servidor
  const cargarReglasAlertas = useCallback(async () => {
    const resultado = await listarReglasService();
    if (resultado.success) {
      setReglasAlertas(resultado.reglas);
    }
  }, []);

  const cargarMonitoreados = useCallback(async () => {
    const resultado = await listarMonitoreadosService();
    if (resultado.success) {
      setProcesosMonitoreados(resultado.procesos);
    }
  }, []);

  const cargarAlertasReales = useCallback(async () => {
    const resultado = await obtenerDatosAlertas();
    if (resultado.success) {
      setAlertas(resultado.eventos);
    }
    cargarReglasAlertas();
    // Crear una alerta guarda el proceso en la base, así que también puede cambiar la lista de monitoreados
    cargarMonitoreados();
  }, [cargarReglasAlertas, cargarMonitoreados]);

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

    // Si el proceso abierto dejó de correr se sigue mostrando (puede ser uno monitoreado), pero sin consumo
    setProcesoSeleccionado((prev) => {
      if (!prev) return null;
      const matched = procesosConEtiquetas.find((p) => p.name === prev.name);
      return matched
        ? { ...matched, enEjecucion: true }
        : { ...prev, pids: [], cpu_percent: 0, memory_percent: 0, enEjecucion: false };
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

  // Reglas de alerta por proceso: cada acción recarga las reglas y devuelve el resultado para que el panel muestre el error
  const handleCrearAlertaProceso = async (nombreProceso, tipo, valorLimite) => {
    const res = await crearAlertaProcesoService(nombreProceso, tipo, valorLimite);
    if (res.success) cargarReglasAlertas();
    return res;
  };

  const handleActualizarReglaAlerta = async (alertaId, cambios) => {
    const res = await actualizarReglaService(alertaId, cambios);
    if (res.success) cargarReglasAlertas();
    return res;
  };

  const handleEliminarReglaAlerta = async (alertaId) => {
    const res = await eliminarReglaService(alertaId);
    if (res.success) cargarReglasAlertas();
    return res;
  };

  const handleMonitorearProceso = async (nombreProceso) => {
    const res = await monitorearProcesoService(nombreProceso);
    if (res.success) cargarMonitoreados();
    return res;
  };

  // Dejar de monitorear borra el proceso de la base junto con su historial y sus alertas
  const handleDejarDeMonitorear = async (procesoId) => {
    const res = await dejarDeMonitorearService(procesoId);
    if (res.success) {
      cargarMonitoreados();
      cargarReglasAlertas();
    }
    return res;
  };

  // Al presionar un proceso se abre su detalle en la columna derecha.
  // Los monitoreados que están detenidos llegan sin consumo y con enEjecucion en false
  const handleSeleccionarProceso = (proc) => {
    setProcesoSeleccionado({
      ...proc,
      tags: proc.tags?.length ? proc.tags : tagsMapRef.current[proc.name] || [],
      enEjecucion: proc.enEjecucion !== false,
    });
  };

  // Para la tarjeta de procesos: cuántos de los monitoreados están corriendo ahora
  const nombresEnEjecucion = new Set(procesos.map((p) => normalizarNombreProceso(p.name)));
  const monitoreadosEnEjecucion = procesosMonitoreados.filter((p) =>
    nombresEnEjecucion.has(normalizarNombreProceso(p.nombre))
  ).length;

  const handleCerrarGraficoAmpliado = useCallback(() => setGraficoAmpliado(null), []);

  // Con "Analizar selección" activo, las tarjetas muestran la suma de los procesos seleccionados
  // (la última muestra del historial ya se calcula filtrada en actualizarInformacion)
  const analizandoSeleccion = Boolean(polygonFilteredNames && polygonFilteredNames.length > 0);
  const ultimaMuestra = historialMuestras[historialMuestras.length - 1];
  const cpuMostrado = analizandoSeleccion && ultimaMuestra ? ultimaMuestra.cpu.toFixed(1) : cpuTotal;
  const ramMostrado = analizandoSeleccion && ultimaMuestra ? ultimaMuestra.ram.toFixed(1) : ramTotal;
  const etiquetaFiltro = analizandoSeleccion
    ? `Selección (${polygonFilteredNames.length} ${polygonFilteredNames.length === 1 ? 'proceso' : 'procesos'})`
    : null;

  const handleCerrarPanelProceso = useCallback(() => setProcesoSeleccionado(null), []);

  const procesoMonitoreadoSeleccionado = procesoSeleccionado
    ? procesosMonitoreados.find(
        (p) => normalizarNombreProceso(p.nombre) === normalizarNombreProceso(procesoSeleccionado.name)
      ) || null
    : null;

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

      <main className="main-content">
        {vistaActiva === 'procesos' && (
          <>
            {/* Aviso cuando las tarjetas muestran solo el consumo de los procesos seleccionados */}
            {analizandoSeleccion && (
              <div className="banner-analisis-seleccion">
                <span>
                  📊 Analizando el consumo de: <strong>{polygonFilteredNames.join(', ')}</strong>
                </span>
                <button type="button" className="btn-restablecer-analisis" onClick={handleResetPolygonFilter}>
                  Restablecer a General
                </button>
              </div>
            )}

            <section className="metrics-grid">
              <TarjetaMetrica
                title={analizandoSeleccion ? 'CPU de la Selección' : 'CPU Total Usado'}
                value={cpuMostrado}
                unit="%"
                valores={historialMuestras.map((m) => m.cpu)}
                serie="cpu"
                umbral={umbralCpu}
                etiquetaFiltro={etiquetaFiltro}
                onAmpliar={() => setGraficoAmpliado('cpu')}
              />
              <TarjetaMetrica
                title={analizandoSeleccion ? 'RAM de la Selección' : 'Memoria RAM Usada'}
                value={ramMostrado}
                unit="%"
                valores={historialMuestras.map((m) => m.ram)}
                serie="ram"
                umbral={umbralRam}
                etiquetaFiltro={etiquetaFiltro}
                onAmpliar={() => setGraficoAmpliado('ram')}
              />
              <TarjetaMetrica
                title="Procesos Únicos"
                value={totalProcesosAgrupados}
                detalles={[
                  { etiqueta: 'Monitoreados', valor: procesosMonitoreados.length },
                  { etiqueta: 'Monitoreados en ejecución', valor: monitoreadosEnEjecucion },
                ]}
                subtitle={`Actualizado: ${horaServidor}`}
              />
            </section>

            {/* Gráfico ampliado al hacer clic en la tarjeta de CPU o RAM */}
            {graficoAmpliado && (
              <PoligonoRecursos
                key={graficoAmpliado}
                historial={historialMuestras}
                umbralCpu={umbralCpu}
                umbralRam={umbralRam}
                filtroProcesosNombres={polygonFilteredNames}
                onRestablecerFiltro={handleResetPolygonFilter}
                metricaInicial={graficoAmpliado}
                onCerrar={handleCerrarGraficoAmpliado}
              />
            )}

            {/* La columna derecha solo existe mientras hay un proceso abierto; si no, la tabla ocupa todo el ancho */}
            <div className={`dashboard-layout-desplegable ${procesoSeleccionado ? 'con-detalle' : 'sin-detalle'}`}>
              <div className="columna-tabla">
                <TablaProcesos
                  processes={procesos}
                  onSelectProcess={handleSeleccionarProceso}
                  selectedProcessNames={selectedProcessNames}
                  onSelectionChange={setSelectedProcessNames}
                  onAnalyzeInPolygon={handleAnalyzeInPolygon}
                  analizandoEnPoligonoNombres={polygonFilteredNames}
                  onApplyMassTag={handleApplyMassTag}
                  procesoSeleccionado={procesoSeleccionado}
                  monitoreados={procesosMonitoreados}
                  esAdmin={esAdministrador}
                  onMonitorear={handleMonitorearProceso}
                />
              </div>

              {procesoSeleccionado && (
                <aside className="columna-paneles-derecha">
                  {/* Detalle del proceso: solo aparece cuando se presiona un proceso de la tabla */}
                  <PanelProceso
                    proceso={procesoSeleccionado}
                    procesoMonitoreado={procesoMonitoreadoSeleccionado}
                    onCerrar={handleCerrarPanelProceso}
                    reglasAlertas={reglasAlertas}
                    esAdmin={esAdministrador}
                    onCrearAlerta={handleCrearAlertaProceso}
                    onActualizarAlerta={handleActualizarReglaAlerta}
                    onEliminarAlerta={handleEliminarReglaAlerta}
                    onMonitorear={handleMonitorearProceso}
                    onDejarDeMonitorear={handleDejarDeMonitorear}
                  />
                </aside>
              )}
            </div>
          </>
        )}

        {vistaActiva === 'alertas' && (
          <TablaAlertas
            alertas={alertas}
            onMarcarReconocidas={handleMarcarReconocidas}
            onEliminarAlerta={handleEliminarAlerta}
            esAdmin={esAdministrador}
          />
        )}
      </main>

      <MenuAjustes
        abierto={menuAjustesAbierto}
        onCerrar={() => setMenuAjustesAbierto(false)}
        onActualizarUsuario={onActualizarUsuario}
        usuario={usuario}
        onCerrarSesion={onCerrarSesion}
        onUmbralesActualizados={handleUmbralesActualizados}
      />
    </div>
  );
}

export default Dashboard;
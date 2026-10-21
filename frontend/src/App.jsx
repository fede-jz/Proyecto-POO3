import { useState, useEffect } from 'react';
import { Navbar } from './componentes/Navbar/Navbar';
import { MonitoreoVista } from './vistas/MonitoreoVista';
import { LoginVista } from './vistas/LoginVista';
import { UsuarioVista } from './vistas/UsuarioVista';
import { obtenerDatosYMetricas } from './controladores/gestorProcesos';

function App() {
  const [vistaActual, setVistaActual] = useState('monitoreo');
  const [estadoBackend, setEstadoBackend] = useState('CONECTANDO...');
  const [usuario, setUsuario] = useState(null);

  // Estados de telemetría globales
  const [procesos, setProcesos] = useState([]);
  const [totalProcesosAgrupados, setTotalProcesosAgrupados] = useState(0);
  const [cpuTotal, setCpuTotal] = useState('0.0');
  const [ramTotal, setRamTotal] = useState('0.0');
  const [horaServidor, setHoraServidor] = useState('');
  const [historialMuestras, setHistorialMuestras] = useState([]);

  // Polling continuo de métricas en segundo plano
  const actualizarInformacion = async () => {
    const datos = await obtenerDatosYMetricas();
    setProcesos(datos.procesos);
    setEstadoBackend(datos.estadoBackend);
    setTotalProcesosAgrupados(datos.totalProcesosAgrupados);
    setCpuTotal(datos.cpuTotal);
    setRamTotal(datos.ramTotal);

    const cpuNum = parseFloat(datos.cpuTotal) || 0;
    const ramNum = parseFloat(datos.ramTotal) || 0;
    const timestampActual = new Date().toLocaleTimeString();

    // Actualiza el buffer FIFO manteniendo exactamente hasta 30 muestras
    setHistorialMuestras(prev => {
      const nuevaMuestra = { time: timestampActual, cpu: cpuNum, ram: ramNum };
      const actualizado = [...prev, nuevaMuestra];
      if (actualizado.length > 30) {
        actualizado.shift();
      }
      return actualizado;
    });
  };

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
  }, []);

  return (
    <div className='app-conteiner'>
      <Navbar 
        status={estadoBackend} 
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        usuario={usuario}
        onCerrarSesion={() => { setUsuario(null); setVistaActual('login'); }}
      />

      {vistaActual === 'monitoreo' && (
        <MonitoreoVista 
          procesos={procesos}
          totalProcesosAgrupados={totalProcesosAgrupados}
          cpuTotal={cpuTotal}
          ramTotal={ramTotal}
          horaServidor={horaServidor}
          historialMuestras={historialMuestras}
        />
      )}

      {vistaActual === 'usuario' && (
        <UsuarioVista usuario={usuario} />
      )}

      {vistaActual === 'login' && (
        <LoginVista onLoginExitoso={(datosUser) => { setUsuario(datosUser); setVistaActual('monitoreo'); }} />
      )}
    </div>
  );
}

export default App;

//vamos a incluir por ahora acá el tema del muestreo para manteneren segundo plano la pedidad de datos a la api
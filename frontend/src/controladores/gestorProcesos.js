import { obtenerProcesosSistema } from '../services/procesos';

export async function obtenerDatosYMetricas() {
  const resultado = await obtenerProcesosSistema();

  if (!resultado.success) {
    return {
      procesos: [],
      estadoBackend: 'OFFLINE',
      totalProcesosAgrupados: 0,
      cpuTotal: '0.0',
      ramTotal: '0.0',
    };
  }

  const procesos = resultado.data;

  // calculos de consumo
  const totalProcesosAgrupados = procesos.length;
  const cpuTotal = procesos.reduce((acc, p) => acc + (p.cpu_percent || 0), 0).toFixed(1);
  const ramTotal = procesos.reduce((acc, p) => acc + (p.memory_percent || 0), 0).toFixed(1);

  return {
    procesos,
    estadoBackend: 'ONLINE',
    totalProcesosAgrupados,
    cpuTotal,
    ramTotal,
  };
}

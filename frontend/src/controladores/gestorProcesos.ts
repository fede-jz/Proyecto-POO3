import { obtenerProcesosSistema } from '../services/procesos';
import { Process } from '../types';

export interface DatosYMetricas {
  procesos: Process[];
  estadoBackend: string;
  totalProcesosAgrupados: number;
  cpuTotal: string;
  ramTotal: string;
}

export async function obtenerDatosYMetricas(): Promise<DatosYMetricas> {
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

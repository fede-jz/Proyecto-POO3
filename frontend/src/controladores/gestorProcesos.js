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
  const totalProcesosAgrupados = procesos.length;

  // Usamos los totales exactos sincronizados directamente del backend
  const cpuTotal = (resultado.cpuTotal !== undefined ? Number(resultado.cpuTotal) : 0).toFixed(1);
  const ramTotal = (resultado.ramTotal !== undefined ? Number(resultado.ramTotal) : 0).toFixed(1);

  return {
    procesos,
    estadoBackend: 'ONLINE',
    totalProcesosAgrupados,
    cpuTotal,
    ramTotal,
  };
}

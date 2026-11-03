import { obtenerToken } from './authService';
import { leerRespuesta } from './alertas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TAGS_STORAGE_KEY = 'monitoreo_procesos_tags';

export const DEFAULT_TAGS = {
  'chrome.exe': ['Web', 'Navegador'],
  'code.exe': ['Desarrollo', 'IDE'],
  'node.exe': ['Desarrollo', 'Servidor'],
  'explorer.exe': ['Sistema', 'UI'],
  'System': ['Sistema', 'Kernel'],
  'svchost.exe': ['Sistema', 'Servicios'],
  'postgres.exe': ['Base de Datos', 'Servidor'],
  'docker.exe': ['Contenedor', 'Desarrollo'],
  'discord.exe': ['Comunicación'],
  'spotify.exe': ['Multimedia'],
  'slack.exe': ['Comunicación', 'Trabajo'],
  'windowsserver.exe': ['Sistema'],
  'taskhostw.exe': ['Sistema'],
  'dwm.exe': ['Sistema', 'Gráficos'],
  'python.exe': ['Desarrollo', 'Scripting'],
};

export function getStoredTags() {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_TAGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_TAGS };
}

export function saveStoredTags(tagsMap) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tagsMap));
  } catch {
    // ignore
  }
}

// Listado de procesos del sistema directo del backend con soporte de etiquetas y métricas unificadas
export async function obtenerProcesosSistema() {
  const tagsMap = getStoredTags();
  try {
    const response = await fetch(`${API_URL}/procesos/sistema`, {
      headers: {
        "Authorization": `Bearer ${obtenerToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const resultado = await response.json();
    
    // Soporte de doble compatibilidad: extrae la lista de procesos y los totales globales
    const listaProcesos = resultado.procesos || resultado;
    const cpuTotal = resultado.cpuTotal !== undefined ? resultado.cpuTotal : 0.0;
    const ramTotal = resultado.ramTotal !== undefined ? resultado.ramTotal : 0.0;
    
    // Vincular etiquetas actuales con la lista que devuelve el backend
    const withTags = listaProcesos.map((p) => ({
      ...p,
      tags: tagsMap[p.name] || [],
    }));

    return { 
      success: true, 
      data: withTags,
      cpuTotal: cpuTotal,
      ramTotal: ramTotal
    };
  } catch (error) {
    console.error('Error de conexión con el backend:', error);
    return { success: false, data: [], error: error.message, cpuTotal: 0.0, ramTotal: 0.0 };
  }
}

// El backend guarda los procesos con ".exe"; para comparar nombres se ignora eso y las mayúsculas
export const normalizarNombreProceso = (nombre) =>
  String(nombre || '').trim().toLowerCase().replace(/\.exe$/, '');

/**
 * Obtiene los procesos monitoreados (todos los procesos guardados en la base)
 */
export async function listarMonitoreadosService() {
  try {
    const respuesta = await fetch(`${API_URL}/procesos/`, {
      headers: {
        "Authorization": `Bearer ${obtenerToken()}`,
      },
    });
    const resultado = await leerRespuesta(respuesta, 'Error al obtener los procesos monitoreados.');
    return { ...resultado, procesos: resultado.success ? resultado.datos : [] };
  } catch (error) {
    console.error('Error de red al obtener los procesos monitoreados:', error);
    return { success: false, procesos: [], mensaje: 'Error de conexión con el servidor' };
  }
}

/**
 * Empieza a monitorear un proceso por nombre, aunque no esté corriendo (requiere rol Administrador)
 */
export async function monitorearProcesoService(nombre) {
  try {
    const respuesta = await fetch(`${API_URL}/procesos/`, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${obtenerToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre }),
    });
    const resultado = await leerRespuesta(respuesta, 'Error al monitorear el proceso.');
    return { ...resultado, proceso: resultado.datos };
  } catch (error) {
    console.error('Error de red al monitorear el proceso:', error);
    return { success: false, mensaje: 'Error de conexión con el servidor' };
  }
}

/**
 * Deja de monitorear un proceso (requiere rol Administrador).
 * Se borra de la base junto con su historial y sus alertas
 */
export async function dejarDeMonitorearService(procesoId) {
  try {
    const respuesta = await fetch(`${API_URL}/procesos/${procesoId}`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${obtenerToken()}`,
      },
    });
    return await leerRespuesta(respuesta, 'Error al dejar de monitorear el proceso.');
  } catch (error) {
    console.error('Error de red al dejar de monitorear el proceso:', error);
    return { success: false, mensaje: 'Error de conexión con el servidor' };
  }
}

/**
 * Obtiene el historial guardado de CPU y RAM de un proceso monitoreado en las últimas `horas`
 */
export async function obtenerHistorialService(procesoId, horas = 1) {
  try {
    const respuesta = await fetch(`${API_URL}/procesos/${procesoId}/historial?horas=${horas}`, {
      headers: {
        "Authorization": `Bearer ${obtenerToken()}`,
      },
    });
    const resultado = await leerRespuesta(respuesta, 'Error al obtener el historial.');
    return { ...resultado, historial: resultado.success ? resultado.datos : [] };
  } catch (error) {
    console.error('Error de red al obtener el historial:', error);
    return { success: false, historial: [], mensaje: 'Error de conexión con el servidor' };
  }
}

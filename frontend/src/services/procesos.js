import { obtenerToken } from './authService';

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

// Búsqueda de proceso por nombre conectada al backend
export async function buscarProcesoPorNombre(nombre) {
  const tagsMap = getStoredTags();
  try {
    const response = await fetch(`${API_URL}/procesos/sistema/buscar?nombre=${encodeURIComponent(nombre)}`);
    const data = await response.json();

    if (response.ok && data.data) {
      const p = data.data;
      return { 
        success: true, 
        data: [{ ...p, tags: tagsMap[p.name] || [] }] 
      };
    } else {
      return { success: false, data: [] };
    }
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
}

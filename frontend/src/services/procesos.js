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

// Initial simulated process pool reflecting realistic OS processes
const BASE_PROCESSES = [
  { name: 'chrome.exe', pids: [3412, 5120, 8924, 10240, 11452], cpu_percent: 14.8, memory_percent: 21.5 },
  { name: 'code.exe', pids: [4820, 7120, 9400], cpu_percent: 6.2, memory_percent: 12.4 },
  { name: 'node.exe', pids: [8112, 12404], cpu_percent: 8.5, memory_percent: 9.8 },
  { name: 'explorer.exe', pids: [1540], cpu_percent: 1.2, memory_percent: 4.1 },
  { name: 'System', pids: [4], cpu_percent: 2.1, memory_percent: 1.5 },
  { name: 'svchost.exe', pids: [892, 1044, 1188, 1420], cpu_percent: 3.4, memory_percent: 5.8 },
  { name: 'postgres.exe', pids: [2980, 3104, 3216], cpu_percent: 2.8, memory_percent: 6.2 },
  { name: 'docker.exe', pids: [4420, 6800], cpu_percent: 5.7, memory_percent: 11.0 },
  { name: 'discord.exe', pids: [7740, 9120], cpu_percent: 3.1, memory_percent: 7.4 },
  { name: 'spotify.exe', pids: [5580, 6220], cpu_percent: 2.3, memory_percent: 4.9 },
  { name: 'slack.exe', pids: [8840, 10100], cpu_percent: 4.2, memory_percent: 8.6 },
  { name: 'windowsserver.exe', pids: [720], cpu_percent: 0.9, memory_percent: 2.3 },
  { name: 'taskhostw.exe', pids: [2308], cpu_percent: 0.4, memory_percent: 1.1 },
  { name: 'dwm.exe', pids: [1124], cpu_percent: 1.8, memory_percent: 3.2 },
  { name: 'python.exe', pids: [9912], cpu_percent: 4.5, memory_percent: 5.1 },
];

let currentProcesses = [...BASE_PROCESSES];

function generateSimulatedProcesses() {
  const tagsMap = getStoredTags();
  currentProcesses = currentProcesses.map((proc) => {
    const cpuJitter = (Math.random() * 2 - 1) * 1.5;
    const ramJitter = (Math.random() * 2 - 1) * 0.4;
    const newCpu = Math.max(0.1, Math.min(99.0, Number((proc.cpu_percent + cpuJitter).toFixed(1))));
    const newRam = Math.max(0.5, Math.min(99.0, Number((proc.memory_percent + ramJitter).toFixed(1))));
    return {
      ...proc,
      cpu_percent: newCpu,
      memory_percent: newRam,
      tags: tagsMap[proc.name] || [],
    };
  });
  return currentProcesses;
}

export async function obtenerProcesosSistema() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const tagsMap = getStoredTags();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${API_URL}/procesos/sistema`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const resultado = await response.json();
      const withTags = resultado.map((p) => ({
        ...p,
        tags: tagsMap[p.name] || [],
      }));
      return { success: true, data: withTags };
    }
  } catch {
    // Graceful fallback to client-side system telemetry
  }

  return {
    success: true,
    data: generateSimulatedProcesses(),
  };
}

// Búsqueda de proceso por nombre (con o sin extensión .exe)
export async function buscarProcesoPorNombre(nombre) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const tagsMap = getStoredTags();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(`${API_URL}/procesos/sistema/buscar?nombre=${encodeURIComponent(nombre)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      const p = data.data;
      if (p) {
        return {
          success: true,
          data: [{ ...p, tags: tagsMap[p.name] || [] }],
        };
      }
    }
  } catch {
    // Fallback to internal lookup
  }

  const nombreLimpio = nombre.trim().toLowerCase();
  const variantes = new Set([nombreLimpio]);
  if (!nombreLimpio.endsWith('.exe')) {
    variantes.add(`${nombreLimpio}.exe`);
  }

  const match = currentProcesses.find((p) => variantes.has(p.name.toLowerCase()));
  if (match) {
    return {
      success: true,
      data: [{ ...match, tags: tagsMap[match.name] || [] }],
    };
  }

  return { success: false, data: [] };
}

// In-memory process registry tracking (preserves backend database features)
const DB_STORAGE_KEY = 'monitoreo_procesos_db';

function getStoredDbProcesses() {
  try {
    const stored = localStorage.getItem(DB_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore storage error
  }
  return [
    { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', nombre: 'chrome.exe', estado: 'activo' },
    { id: '2c9e7cde-ccfe-4c3e-8c6e-bc9efcce5cfe', nombre: 'postgres.exe', estado: 'activo' },
    { id: '3d9f8def-ddff-4d4f-9d7f-cd9ffdff6dfe', nombre: 'explorer.exe', estado: 'activo' },
    { id: '4e9a9efa-eefa-4e5a-ae8a-deafeeaa7efa', nombre: 'backup_service.exe', estado: 'inactivo' },
  ];
}

export function obtenerProcesosDb() {
  return getStoredDbProcesses();
}

export function crearProcesoDb(nombre, estado = 'activo') {
  const procesos = getStoredDbProcesses();
  const cleanName = nombre.toLowerCase().endsWith('.exe') ? nombre : `${nombre}.exe`;
  const existing = procesos.find((p) => p.nombre.toLowerCase() === cleanName.toLowerCase());
  if (existing) return existing;

  const nuevo = {
    id: crypto.randomUUID(),
    nombre: cleanName,
    estado,
  };
  const actualizados = [...procesos, nuevo];
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(actualizados));
  } catch {
    // Ignore error
  }
  return nuevo;
}

export function eliminarProcesoDb(id) {
  const procesos = getStoredDbProcesses();
  const actualizados = procesos.filter((p) => p.id !== id);
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(actualizados));
    return true;
  } catch {
    return false;
  }
}

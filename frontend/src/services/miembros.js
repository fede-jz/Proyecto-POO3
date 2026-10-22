const STORAGE_KEY_MIEMBROS = 'monitoreo_miembros_sistema';

// Inicializar vacío para que el admin cargue sus propios miembros
const MIEMBROS_INICIALES = []; 

export function getStoredMiembros() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MIEMBROS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return MIEMBROS_INICIALES;
}

export function saveStoredMiembros(miembros) {
  try {
    localStorage.setItem(STORAGE_KEY_MIEMBROS, JSON.stringify(miembros));
  } catch {
    // ignore
  }
}
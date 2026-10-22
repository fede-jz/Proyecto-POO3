const STORAGE_KEY_MIEMBROS = 'monitoreo_miembros_sistema';

const MIEMBROS_INICIALES = [
  {
    id: 'USR-01',
    nombre: 'Abril Ruiz',
    email: 'abrilruizblagine2019@gmail.com',
    rol: 'Administrador',
    ultimaConexion: 'Hoy a las 09:30',
    avatarIniciales: 'AR',
  },
  {
    id: 'USR-02',
    nombre: 'Carlos Mendoza',
    email: 'carlos.mendoza@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: 'Hoy a las 09:14',
    avatarIniciales: 'CM',
  },
  {
    id: 'USR-03',
    nombre: 'Sofía Valenzuela',
    email: 'sofia.v@sysmonitor.net',
    rol: 'Administrador',
    ultimaConexion: 'Hoy a las 08:45',
    avatarIniciales: 'SV',
  },
  {
    id: 'USR-04',
    nombre: 'Lucas Benítez',
    email: 'lucas.benitez@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: 'Ayer a las 18:22',
    avatarIniciales: 'LB',
  },
  {
    id: 'USR-05',
    nombre: 'Valentina Gómez',
    email: 'valentina.g@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: 'Ayer a las 17:50',
    avatarIniciales: 'VG',
  },
  {
    id: 'USR-06',
    nombre: 'Mateo Fernández',
    email: 'mateo.f@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-20 14:10',
    avatarIniciales: 'MF',
  },
  {
    id: 'USR-07',
    nombre: 'Camila Herrera',
    email: 'camila.h@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: '2026-10-20 11:32',
    avatarIniciales: 'CH',
  },
  {
    id: 'USR-08',
    nombre: 'Javier Morales',
    email: 'j.morales@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-19 16:45',
    avatarIniciales: 'JM',
  },
  {
    id: 'USR-09',
    nombre: 'Daniela Castro',
    email: 'daniela.castro@sysmonitor.net',
    rol: 'Administrador',
    ultimaConexion: '2026-10-19 15:20',
    avatarIniciales: 'DC',
  },
  {
    id: 'USR-10',
    nombre: 'Nicolás Rojas',
    email: 'nicolas.rojas@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: '2026-10-19 10:05',
    avatarIniciales: 'NR',
  },
  {
    id: 'USR-11',
    nombre: 'Paula Silva',
    email: 'paula.silva@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-18 19:40',
    avatarIniciales: 'PS',
  },
  {
    id: 'USR-12',
    nombre: 'Andrés Navarro',
    email: 'andres.n@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-18 14:15',
    avatarIniciales: 'AN',
  },
  {
    id: 'USR-13',
    nombre: 'Florencia Díaz',
    email: 'flor.diaz@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: '2026-10-17 21:00',
    avatarIniciales: 'FD',
  },
  {
    id: 'USR-14',
    nombre: 'Esteban Quiroga',
    email: 'e.quiroga@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-17 12:30',
    avatarIniciales: 'EQ',
  },
  {
    id: 'USR-15',
    nombre: 'Mariana López',
    email: 'mariana.lopez@sysmonitor.net',
    rol: 'Visualizador',
    ultimaConexion: '2026-10-16 18:10',
    avatarIniciales: 'ML',
  },
  {
    id: 'USR-16',
    nombre: 'Gabriel Torres',
    email: 'gabriel.torres@sysmonitor.net',
    rol: 'Operador de Guardia',
    ultimaConexion: '2026-10-16 09:40',
    avatarIniciales: 'GT',
  },
];

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

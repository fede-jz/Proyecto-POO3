import { AlertaSistema } from '../types';

const STORAGE_KEY_ALERTAS = 'monitoreo_alertas_sistema';

const ALERTAS_INICIALES: AlertaSistema[] = [
  {
    id: 'ALT-9841',
    procesoId: 'PID-2980',
    procesoNombre: 'postgres.exe',
    tipo: 'Exceso de CPU',
    severidad: 'Alto',
    estadoEntrega: 'No reconocido',
    fechaHora: '2026-10-21 09:14:32',
    valorDetectado: '91.8%',
    umbral: '80.0%',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 09:14:33',
      reintentos: 0,
      entregado: true,
      cuerpo: `🚨 [ALERTA DE ALTA PRIORIDAD]
ID: ALT-9841
Proceso: postgres.exe (PID: 2980)
Evento: Consumo de CPU elevado detectado
Nivel: 91.8% (Límite configurado: 80.0%)
Timestamp: 2026-10-21 09:14:32 UTC
Acción sugerida: Verificar consultas bloqueantes en base de datos.`,
    },
    observaciones: 'Se detectó índice faltante en tabla historial; query lenta en ejecución.',
  },
  {
    id: 'ALT-9840',
    procesoId: 'PID-3412',
    procesoNombre: 'chrome.exe',
    tipo: 'Exceso de RAM',
    severidad: 'Medio',
    estadoEntrega: 'Reconocido',
    fechaHora: '2026-10-21 08:55:10',
    valorDetectado: '84.5%',
    umbral: '80.0%',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 08:55:11',
      reintentos: 0,
      entregado: true,
      cuerpo: `⚠️ [ADVERTENCIA DE RECURSOS]
ID: ALT-9840
Proceso: chrome.exe (PIDs agrupados: 3412, 5120)
Evento: Memoria RAM por encima del umbral de advertencia
Uso detectado: 84.5% (Umbral: 80.0%)
Timestamp: 2026-10-21 08:55:10 UTC`,
    },
    observaciones: 'Pestañas pesadas de desarrollo abiertas; uso controlado.',
  },
  {
    id: 'ALT-9839',
    procesoId: 'PID-8890',
    procesoNombre: 'backup_service.exe',
    tipo: 'Caída de Servicio',
    severidad: 'Crítico',
    estadoEntrega: 'No entregado',
    fechaHora: '2026-10-21 08:40:02',
    valorDetectado: 'Proceso detenido inesperadamente',
    umbral: 'KeepAlive Heartbeat',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 08:40:05',
      reintentos: 3,
      entregado: false,
      cuerpo: `🔥 [FALLO CRÍTICO DE SISTEMA]
ID: ALT-9839
Servicio: backup_service.exe
Evento: Proceso detenido sin código de salida limpio (Crash).
Telegram Error: Conexión rechazada por timeout de red.`,
    },
    observaciones: 'Se reinició el daemon de backup manualmente.',
  },
  {
    id: 'ALT-9838',
    procesoId: 'PID-8112',
    procesoNombre: 'node.exe',
    tipo: 'Exceso de CPU',
    severidad: 'Medio',
    estadoEntrega: 'Reconocido',
    fechaHora: '2026-10-21 08:12:45',
    valorDetectado: '78.2%',
    umbral: '75.0%',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 08:12:46',
      reintentos: 0,
      entregado: true,
      cuerpo: `ℹ️ [AVISO DE RENDIMIENTO]
ID: ALT-9838
Proceso: node.exe (PID: 8112)
CPU: 78.2% en pico de carga de compilación Vite.`,
    },
    observaciones: 'Compilación TypeScript ejecutada sin anomalías.',
  },
  {
    id: 'ALT-9837',
    procesoId: 'PID-4',
    procesoNombre: 'System',
    tipo: 'Informativa',
    severidad: 'Bajo',
    estadoEntrega: 'Reconocido',
    fechaHora: '2026-10-21 07:30:00',
    valorDetectado: 'Reinicio programado finalizado',
    umbral: 'Mantenimiento preventivo',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 07:30:01',
      reintentos: 0,
      entregado: true,
      cuerpo: `ℹ️ [INFO DE SISTEMA]
ID: ALT-9837
Kernel inicializado correctamente. Todos los pools de conexión abiertos.`,
    },
    observaciones: 'Ciclo de mantenimiento completado con éxito.',
  },
  {
    id: 'ALT-9836',
    procesoId: 'PID-4420',
    procesoNombre: 'docker.exe',
    tipo: 'Exceso de RAM',
    severidad: 'Alto',
    estadoEntrega: 'No reconocido',
    fechaHora: '2026-10-21 07:05:18',
    valorDetectado: '89.4%',
    umbral: '85.0%',
    mensajeTelegram: {
      chatId: '782828437',
      botUsuario: '@SysMonitorAlertBot',
      enviadoEn: '2026-10-21 07:05:19',
      reintentos: 0,
      entregado: true,
      cuerpo: `🚨 [ALERTA DE MEMORIA]
ID: ALT-9836
Proceso: docker.exe (PID: 4420)
RAM: 89.4% (Umbral: 85.0%)
Contenedores en ejecución consumiendo buffer cache.`,
    },
  },
];

export function getStoredAlertas(): AlertaSistema[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTAS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return ALERTAS_INICIALES;
}

export function saveStoredAlertas(alertas: AlertaSistema[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ALERTAS, JSON.stringify(alertas));
  } catch {
    // ignore
  }
}

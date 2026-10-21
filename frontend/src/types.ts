export interface Process {
  pid?: number;
  pids: number[];
  name: string;
  cpu_percent: number;
  memory_percent: number;
  tags?: string[];
}

export interface MetricSample {
  time: string;
  cpu: number;
  ram: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ProcessRecord {
  id: string;
  nombre: string;
  estado: 'activo' | 'inactivo' | 'desconocido';
}

export type SeveridadAlerta = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
export type TipoAlerta =
  | 'Informativa'
  | 'Advertencia'
  | 'Crítica'
  | 'Caída de Servicio'
  | 'Exceso de CPU'
  | 'Exceso de RAM';
export type EstadoEntregaTelegram = 'No entregado' | 'No reconocido' | 'Reconocido';

export interface TelegramPayload {
  chatId: string;
  botUsuario: string;
  cuerpo: string;
  enviadoEn: string;
  reintentos: number;
  entregado: boolean;
}

export interface AlertaSistema {
  id: string;
  procesoId: string;
  procesoNombre: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  estadoEntrega: EstadoEntregaTelegram;
  fechaHora: string;
  valorDetectado?: string;
  umbral?: string;
  mensajeTelegram: TelegramPayload;
  observaciones?: string;
}

export type VistaActiva = 'procesos' | 'alertas';

export type RolUsuario = 'Administrador' | 'Operador de Guardia' | 'Visualizador';

export interface MiembroSistema {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  ultimaConexion: string;
  avatarIniciales: string;
}

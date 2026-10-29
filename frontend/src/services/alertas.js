import { obtenerToken } from './authService';

const API_URL = "http://localhost:8000";

/**
 * Obtiene las reglas y el historial de eventos reales desde FastAPI
 */
export async function obtenerDatosAlertas() {
  const token = obtenerToken();
  if (!token) {
    console.warn("⚠️ No se encontró token de acceso en localStorage.");
    return { success: false, reglas: [], eventos: [] };
  }

  try {
    const respuesta = await fetch(`${API_URL}/alertas/eventos`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      throw new Error(`Error en el servidor: ${respuesta.status}`);
    }

    const eventos = await respuesta.json();

    const TIPOS_LEGIBLES = { cpu: 'Exceso de CPU', ram: 'Exceso de RAM', caida: 'Caída de proceso' };

    // Mapeamos los eventos asegurando todas las propiedades que TablaAlertas.jsx necesita
    const eventosMapeados = eventos.map((ev) => {
      const esCaida = ev.tipo === 'caida';
      const valorNum = Number(ev.valor_detectado || 0);
      const tipoLegible = TIPOS_LEGIBLES[ev.tipo] || ev.tipo_evento;
      const idCorto = String(ev.id || '00000000').slice(0, 8).toUpperCase();
      // Sin proceso = alerta global del servidor
      const procesoNombre = ev.nombre_proceso || 'Servidor (global)';

      return {
        id: `EV-${idCorto}`,
        eventoId: ev.id,
        procesoId: ev.proceso_id ? `PID-${String(ev.proceso_id).slice(0, 4)}` : 'GLOBAL',
        procesoNombre: procesoNombre,
        tipo: tipoLegible,
        severidad: esCaida || valorNum > 90 ? 'Crítico' : valorNum > 85 ? 'Alto' : 'Medio',
        estadoEntrega: ev.reconocido ? 'Reconocido' : 'No reconocido',
        fechaHora: ev.creado_en ? new Date(ev.creado_en).toLocaleString() : 'Fecha no disponible',
        valorDetectado: esCaida ? '—' : `${valorNum.toFixed(1)}%`,
        umbral: ev.valor_limite != null ? `${Number(ev.valor_limite).toFixed(1)}%` : '—',
        observaciones: ev.observaciones || 'Evento registrado automáticamente por el monitor.',
        // Mismo formato que el mensaje que manda el backend (telegram_controller._armar_mensaje)
        mensajeTelegram: {
          entregado: ev.notificado,
          cuerpo: [
            `🚨 ${tipoLegible}`,
            `📍 ${procesoNombre}`,
            ...(esCaida ? [] : [`📊 Valor detectado: ${valorNum.toFixed(1)}% (límite ${Number(ev.valor_limite).toFixed(1)}%)`]),
            `🕒 ${ev.creado_en ? new Date(ev.creado_en).toLocaleString() : '-'}`,
          ].join('\n'),
        }
      };
    });

    // Las reglas no se usan en el front; se devuelve vacío para mantener el formato que espera el Dashboard
    return {
      success: true,
      reglas: [],
      eventos: eventosMapeados
    };

  } catch (error) {
    console.error("❌ Error al conectar con el backend de alertas:", error);
    return { success: false, reglas: [], eventos: [] };
  }
}

/**
 * Elimina un evento de alerta de la base de datos (Requiere rol Administrador)
 */
export async function eliminarEventoService(eventoId) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(`${API_URL}/alertas/eventos/${eventoId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const resultado = await respuesta.json();
    
    if (!respuesta.ok) {
      return { success: false, mensaje: resultado.detail || "No autorizado" };
    }

    return { success: true, mensaje: resultado.mensaje };
  } catch (error) {
    console.error("Error de red al eliminar evento:", error);
    return { success: false, mensaje: "Error de conexión con el servidor" };
  }
}

/**
 * Marca un evento de alerta como reconocido en la base de datos
 */
export async function reconocerAlertaService(eventoId) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(`${API_URL}/alertas/eventos/${eventoId}/reconocer`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const resultado = await respuesta.json();
    
    if (!respuesta.ok) {
      return { success: false, mensaje: resultado.detail || "Error al actualizar" };
    }

    return { success: true, mensaje: resultado.mensaje };
  } catch (error) {
    console.error("Error de red al reconocer alerta:", error);
    return { success: false, mensaje: "Error de conexión con el servidor" };
  }
}

/**
 * Obtiene los umbrales de las alertas globales del servidor (null si alguna no existe)
 */
export async function obtenerMisUmbralesService() {
  const token = obtenerToken();
  if (!token) return { cpu: 80, ram: 80 };

  try {
    const res = await fetch(`${API_URL}/alertas/globales`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Error al obtener umbrales:", err);
  }
  return { cpu: 80, ram: 80 };
}

/**
 * Crea o actualiza las alertas globales de CPU y RAM del servidor (requiere rol Administrador)
 */
export async function guardarMisUmbralesService(cpu, ram) {
  const token = obtenerToken();
  if (!token) throw new Error("No hay sesión activa");

  const res = await fetch(`${API_URL}/alertas/globales`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ cpu: parseFloat(cpu), ram: parseFloat(ram) })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Error al actualizar los umbrales.");
  }
  return data;
}
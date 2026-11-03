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

    // Las reglas se cargan aparte con listarReglasService; se devuelve vacío para mantener el formato
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

/**
 * Lee la respuesta del servidor sin romperse si no es JSON (por ejemplo un 500 en texto plano)
 * y arma un mensaje de error legible a partir del "detail" de FastAPI
 */
export async function leerRespuesta(respuesta, mensajePorDefecto) {
  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (respuesta.ok) {
    return { success: true, datos };
  }

  let mensaje = mensajePorDefecto;
  if (typeof datos?.detail === "string") {
    mensaje = datos.detail;
  } else if (Array.isArray(datos?.detail) && datos.detail.length > 0) {
    // Errores de validación (422): se muestra el primero sin el prefijo "Value error, "
    mensaje = String(datos.detail[0].msg || mensajePorDefecto).replace(/^Value error, /, "");
  }
  return { success: false, mensaje };
}

/**
 * Obtiene todas las reglas de alerta (globales y por proceso)
 */
export async function listarReglasService() {
  const token = obtenerToken();
  if (!token) return { success: false, reglas: [] };

  try {
    const respuesta = await fetch(`${API_URL}/alertas/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const resultado = await leerRespuesta(respuesta, "Error al obtener las alertas.");
    return { ...resultado, reglas: resultado.success ? resultado.datos : [] };
  } catch (error) {
    console.error("Error de red al obtener las reglas de alerta:", error);
    return { success: false, reglas: [], mensaje: "Error de conexión con el servidor" };
  }
}

/**
 * Crea una alerta sobre un proceso (requiere rol Administrador).
 * tipo: 'caida' | 'cpu' | 'ram'. valorLimite solo para cpu/ram
 */
export async function crearAlertaProcesoService(nombreProceso, tipo, valorLimite) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(`${API_URL}/alertas/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre_proceso: nombreProceso,
        tipo,
        valor_limite: tipo === "caida" ? null : parseFloat(valorLimite),
      }),
    });
    const resultado = await leerRespuesta(respuesta, "Error al crear la alerta.");
    return { ...resultado, alerta: resultado.datos };
  } catch (error) {
    console.error("Error de red al crear la alerta:", error);
    return { success: false, mensaje: "Error de conexión con el servidor" };
  }
}

/**
 * Cambia el límite y/o activa o desactiva una alerta (requiere rol Administrador).
 * cambios: { valor_limite?, activo? }
 */
export async function actualizarReglaService(alertaId, cambios) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(`${API_URL}/alertas/${alertaId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cambios),
    });
    const resultado = await leerRespuesta(respuesta, "Error al actualizar la alerta.");
    return { ...resultado, alerta: resultado.datos };
  } catch (error) {
    console.error("Error de red al actualizar la alerta:", error);
    return { success: false, mensaje: "Error de conexión con el servidor" };
  }
}

/**
 * Elimina una alerta junto con sus eventos (requiere rol Administrador)
 */
export async function eliminarReglaService(alertaId) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(`${API_URL}/alertas/${alertaId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    return await leerRespuesta(respuesta, "Error al eliminar la alerta.");
  } catch (error) {
    console.error("Error de red al eliminar la alerta:", error);
    return { success: false, mensaje: "Error de conexión con el servidor" };
  }
}
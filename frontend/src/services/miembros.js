const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Obtiene la lista real de miembros desde la base de datos a través del backend.
 */
export async function obtenerMiembros() {
  // Buscamos el token probando las claves más comunes usadas en la app
  const token = localStorage.getItem('access_token') || localStorage.getItem('sysmonitor_token') || localStorage.getItem('token');
  
  if (!token) {
    console.warn("⚠️ No se encontró un token de autenticación en localStorage.");
    return [];
  }

  try {
    const respuesta = await fetch(`${API_URL}/usuarios/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => ({}));
      console.error(`❌ Error del servidor (${respuesta.status}):`, errorData);
      throw new Error(errorData.detail || 'No se pudo obtener la lista de miembros.');
    }

    const datos = await respuesta.json();
    
    // Mapeo de datos para la interfaz de usuario
    return datos.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol || 'Operador de Guardia',
      telegram_chat_id: u.telegram_chat_id,
      ultimaConexion: u.creado_en ? new Date(u.creado_en).toLocaleDateString() : 'Registrado',
      avatarIniciales: u.nombre ? u.nombre.substring(0, 2).toUpperCase() : 'US',
    }));
  } catch (error) {
    console.error('❌ Error al cargar miembros:', error);
    return [];
  }
}

/**
 * Envía la solicitud al backend para modificar el rol de un miembro.
 * Si el usuario logueado no es Administrador, el servidor devolverá un error 403.
 */
export async function actualizarRolMiembro(usuarioId, nuevoRol) {
  const token = localStorage.getItem('access_token') || localStorage.getItem('sysmonitor_token') || localStorage.getItem('token');
  if (!token) throw new Error('No hay una sesión activa.');

  const respuesta = await fetch(`${API_URL}/usuarios/${usuarioId}/rol`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rol: nuevoRol }),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.detail || 'Error al actualizar el rol del miembro.');
  }

  return data;
}
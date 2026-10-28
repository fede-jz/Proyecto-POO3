const API_URL = "http://localhost:8000";
const TOKEN_KEY = "access_token";

export async function registrarUsuario(datos) {
  const respuesta = await fetch(`${API_URL}/auth/registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre: datos.nombre,
      email: datos.email,
      contrasenia: datos.contrasenia,
    }),
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json();
    throw new Error(errorData.detail || "Error al registrar el usuario.");
  }

  return await respuesta.json();
}

export function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function eliminarToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function iniciarSesion(credenciales) {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credenciales.email,
      contrasenia: credenciales.contrasenia,
    }),
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json();
    throw new Error(errorData.detail || "Correo o contraseña incorrectos.");
  }

  const data = await respuesta.json();
  guardarToken(data.access_token);
  return data.usuario; // Retorna el usuario real logueado
}

export async function obtenerUsuarioActual() {
  const token = obtenerToken();
  if (!token) return null;

  try {
    const respuesta = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      eliminarToken(); // Si expiró o es inválido, limpiamos
      return null;
    }

    return await respuesta.json();
  } catch (error) {
    console.error("Error al validar sesión:", error);
    return null;
  }
}
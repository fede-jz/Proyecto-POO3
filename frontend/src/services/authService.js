const API_URL = "http://localhost:8000"; 

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

export async function iniciarSesion(credenciales) {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credenciales.email,
      contrasenia: credenciales.contrasenia,
    }),
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json();
    throw new Error(errorData.detail || "Correo o contraseña incorrectos.");
  }

  return await respuesta.json();
}
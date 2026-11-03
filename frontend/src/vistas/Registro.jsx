import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, UserPlus } from "lucide-react";
import AuthLayout from "../componentes/AuthLayout/AuthLayout.jsx";
import { registrarUsuario } from "../services/authService"; 
import "./Registro.css";

export default function Registro({ cambiarAVistaLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  //  parametros que espera el backend para registrar un usuario
  const [form, setForm] = useState({ nombre: "", email: "", contrasenia: "", confirmContrasenia: "" });
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    if (error) setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setExito("");

    if (form.contrasenia.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.contrasenia !== form.confirmContrasenia) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      // Llamada real a FastAPI que insertará en Supabase
      await registrarUsuario({
        nombre: form.nombre,
        email: form.email,
        contrasenia: form.contrasenia
      });

      setExito("¡Registro exitoso! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        if (cambiarAVistaLogin) cambiarAVistaLogin();
      }, 2000);

    } catch (err) {
      setError(err.message || "Hubo un error al registrar el usuario.");
    } finally {
      setCargando(false);
    }
  }


  return (
    <AuthLayout mode="register">
      <div className="pm-register-card pm-auth-card">
        <div className="pm-card-brand" aria-hidden="true">
          <span><span className="pm-card-brand__glow"><UserPlus size={21} /></span></span>
        </div>
        <div className="pm-auth-card__heading">
          <p className="pm-auth-card__eyebrow">EMPEZÁ A MONITOREAR</p>
          <h2>Crear una cuenta</h2>
          <p>Completá los datos para comenzar.</p>
        </div>

        <form className="pm-form" onSubmit={handleSubmit}>
          <label className="pm-field">
            <span>Nombre completo</span>
            <span className="pm-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                type="text" name="nombre" autoComplete="name"
                placeholder="Tu nombre y apellido" value={form.nombre}
                onChange={update} required
              />
            </span>
          </label>

          <label className="pm-field">
            <span>Correo electrónico</span>
            <span className="pm-input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                type="email" name="email" autoComplete="email"
                placeholder="usuario@ejemplo.com" value={form.email}
                onChange={update} required
              />
            </span>
          </label>

          <label className="pm-field">
            <span>Contraseña</span>
            <span className="pm-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                name="contrasenia" autoComplete="new-password"
                placeholder="Mínimo 8 caracteres" value={form.contrasenia}
                onChange={update} minLength={8} required
              />
              <button
                className="pm-input-action" type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          <label className="pm-field">
            <span>Confirmar contraseña</span>
            <span className="pm-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmContrasenia" autoComplete="new-password"
                placeholder="Repetí tu contraseña" value={form.confirmContrasenia}
                onChange={update} required
              />
              <button
                className="pm-input-action" type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {error && <p className="pm-form-error" role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
          {exito && <p className="pm-form-success" role="alert" style={{ color: '#4ade80', fontSize: '13px' }}>{exito}</p>}

          <button className="pm-primary-button" type="submit" disabled={cargando}>
            <span>{cargando ? "Registrando..." : "Registrarse"}</span><UserPlus size={17} />
          </button>
        </form>

        <p className="pm-auth-card__switch">
          ¿Ya tenés una cuenta?{" "}
          <button 
            type="button" 
            onClick={cambiarAVistaLogin} 
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
          >
            Iniciá sesión
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

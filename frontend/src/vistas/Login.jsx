import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import AuthLayout from "../componentes/AuthLayout/AuthLayout.jsx";
import { iniciarSesion } from "../services/authService.js";
import "./Login.css";
export default function Login({ cambiarAVistaRegistro, onLoginExitoso }) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", contrasenia: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    if (error) setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setCargando(true);

    try {
      // Llamada real a FastAPI -> Supabase
      const datosUsuario = await iniciarSesion({
        email: form.email,
        contrasenia: form.contrasenia
      });

      // Notificamos a App.jsx que el usuario ingresó para pasar al Dashboard
      if (onLoginExitoso) {
        onLoginExitoso(datosUsuario);
      }
    } catch (err) {
      setError(err.message || "Correo o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  }


  return (
    <AuthLayout mode="login">
      <div className="pm-login-card pm-auth-card">
        <div className="pm-card-brand" aria-hidden="true">
          <span><span className="pm-card-brand__glow"><LockKeyhole size={21} /></span></span>
        </div>
        <div className="pm-auth-card__heading">
          <p className="pm-auth-card__eyebrow">BIENVENIDO DE NUEVO</p>
          <h2>Iniciá sesión en tu cuenta</h2>
          <p>Accedé al sistema de monitoreo de procesos.</p>
        </div>

        <form className="pm-form" onSubmit={handleSubmit}>
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
                name="contrasenia" autoComplete="current-password"
                placeholder="Ingresá tu contraseña" value={form.contrasenia}
                onChange={update} required
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

          {error && <p className="pm-form-error" role="alert">{error}</p>}

          <button className="pm-primary-button" type="submit" disabled={cargando}>
            <span>{cargando ? "Iniciando sesión..." : "Iniciar sesión"}</span><ArrowRight size={18} />
          </button>
        </form>

        <p className="pm-auth-card__switch">
          ¿No tenés una cuenta?{" "}
          <button 
            type="button" 
            onClick={cambiarAVistaRegistro}
            className="pm-switch-button"
          >
            Registrate
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

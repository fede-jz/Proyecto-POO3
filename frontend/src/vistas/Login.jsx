import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import AuthLayout from "../componentes/AuthLayout/AuthLayout.jsx";
import { iniciarSesion } from "../services/authService.js";
import "./Login.css";
export default function Login({ cambiarAVistaRegistro, onLoginExitoso }) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
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

      if (remember) {
        localStorage.setItem("remember_user", form.email);
      } else {
        localStorage.removeItem("remember_user");
      }

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

  function handleGoogle() {
    console.info("Conectar con Google OAuth");
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

          <div className="pm-form-options">
            <label className="pm-checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="pm-checkbox__box" />
              <span>Recordarme</span>
            </label>
            <a href="mailto:soporte@processmonitor.local?subject=Recuperar%20contrase%C3%B1a">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && <p className="pm-form-error" role="alert">{error}</p>}

          <button className="pm-primary-button" type="submit" disabled={cargando}>
            <span>{cargando ? "Iniciando sesión..." : "Iniciar sesión"}</span><ArrowRight size={18} />
          </button>
        </form>

        <div className="pm-divider"><span /> <small>o</small> <span /></div>

        <button className="pm-google-button" type="button" onClick={handleGoogle}>
          <GoogleIcon /><span>Continuar con Google</span>
        </button>

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

function GoogleIcon() {
  return (
    <svg className="pm-google-icon" viewBox="0 0 48 48" role="img" aria-label="Google">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.04 46.98 31.97 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 -1)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
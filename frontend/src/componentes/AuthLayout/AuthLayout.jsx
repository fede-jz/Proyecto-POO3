import './AuthLayout.css';
import { Activity, ChartNoAxesCombined, ShieldCheck, Zap } from "lucide-react";
import Brand from "../Brand.jsx";

const features = [
  { icon: Zap, title: "Detección temprana", detail: "de procesos críticos" },
  { icon: ChartNoAxesCombined, title: "Métricas en tiempo real", detail: "(CPU, RAM, procesos)" },
  { icon: ShieldCheck, title: "Alertas y notificaciones", detail: "ante anomalías" },
];

function ServerIllustration() {
  return (
    <div className="pm-server-art" aria-hidden="true">
      <div className="pm-server-art__grid" />
      <div className="pm-server pm-server--back">
        <i /><i /><i />
      </div>
      <div className="pm-server pm-server--middle">
        <i /><i /><i />
      </div>
      <div className="pm-server pm-server--front">
        <i /><i /><i /><i />
      </div>
      <div className="pm-server-art__pulse"><Activity size={18} /></div>
    </div>
  );
}

export default function AuthLayout({ children, mode = "login" }) {
  const isRegister = mode === "register";

  return (
    <main className={`pm-auth pm-auth--${mode}`}>
      <header className="pm-auth__topbar">
        <Brand />
        <div className="pm-topbar-status">
          <span>Infraestructura</span><b>·</b>
          <span>Procesos</span><b>·</b>
          <span>En tiempo real</span>
          <i aria-label="Estado activo" />
        </div>
      </header>

      <section className="pm-auth__content">
        <aside className="pm-intro">
          <div className="pm-intro__copy">
            <p className="pm-eyebrow"><span /> MONITOREO DE INFRAESTRUCTURA</p>
            <h1>Monitoreo de procesos <span>en tiempo real</span></h1>
            <p className="pm-intro__description">
              Supervisá, detectá y prevení fallos en tu infraestructura.
              Todo desde un solo lugar.
            </p>
            <div className="pm-feature-list">
              {features.map(({ icon: Icon, title, detail }) => (
                <div className="pm-feature" key={title}>
                  <span className="pm-feature__icon"><Icon size={18} /></span>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                </div>
              ))}
            </div>
          </div>
          <ServerIllustration />
          <div className="pm-intro__footnote">
            <span className="pm-live-dot" /> Plataforma de observabilidad
          </div>
        </aside>

        <section className="pm-auth__form-area" aria-label={isRegister ? "Registro" : "Inicio de sesión"}>
          {children}
        </section>
      </section>

      <footer className="pm-auth__footer">
        <span>© {new Date().getFullYear()} SysMonitor</span>
        <span>Monitoreo confiable · Infraestructura bajo control</span>
      </footer>
    </main>
  );
}
import './Navbar.css';

export function Navbar({ status = 'OFFLINE', vistaActual, setVistaActual, usuario, onCerrarSesion }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="logo-icon">🛡️</span>
        <h2>NOMBREwebAPP</h2>
        
        {/* Pestañas de Navegación por Secciones */}
        <nav className="navbar-nav-links">
          <button 
            className={`nav-link-btn ${vistaActual === 'monitoreo' ? 'activo' : ''}`}
            onClick={() => setVistaActual('monitoreo')}
          >
            Monitoreo
          </button>
          <button 
            className={`nav-link-btn ${vistaActual === 'usuario' ? 'activo' : ''}`}
            onClick={() => setVistaActual('usuario')}
          >
            Mi Cuenta
          </button>
        </nav>
      </div>

      <div className="navbar-right-group">
        <div className="navbar-status">
          <span className={`status-indicator ${status.toLowerCase()}`}></span>
          <span className="status-text">Servidor: {status}</span>
        </div>

        {usuario ? (
          <button className="auth-action-btn logout" onClick={onCerrarSesion}>
            Cerrar Sesión
          </button>
        ) : (
          <button className="auth-action-btn login" onClick={() => setVistaActual('login')}>
            Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
}
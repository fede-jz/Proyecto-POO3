import React, { useState, useEffect } from 'react';
import Login from './vistas/Login';
import Registro from './vistas/Registro';
import Dashboard from './vistas/Dashboard';
import { obtenerUsuarioActual, eliminarToken } from './services/authService';

export function App() {
  const [vistaActual, setVistaActual] = useState('login');
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function restaurarSesion() {
      try {
        const usuario = await obtenerUsuarioActual();
        if (usuario) {
          setUsuarioLogueado(usuario);
          setVistaActual('dashboard');
        } else {
          setVistaActual('login');
        }
      } catch (err) {
        setVistaActual('login');
      } finally {
        setCargando(false);
      }
    }
    restaurarSesion();
  }, []);

  const handleLoginExitoso = (datosUsuario) => {
    setUsuarioLogueado(datosUsuario);
    setVistaActual('dashboard');
  };

  const handleIngresoInvitado = () => {
    setUsuarioLogueado({ nombre: 'Usuario de Prueba (Invitado)', email: 'test@processmonitor.local', rol: 'Invitado' });
    setVistaActual('dashboard');
  };

  const handleCerrarSesion = () => {
    eliminarToken();
    setUsuarioLogueado(null);
    setVistaActual('login');
  };

  if (cargando) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <p>Restaurando sesión...</p>
      </div>
    );
  }

  return (
    <>
      {vistaActual === 'login' && (
        <Login 
          cambiarAVistaRegistro={() => setVistaActual('registro')} 
          onLoginExitoso={handleLoginExitoso}
          onIngresoInvitado={handleIngresoInvitado}
        />
      )}

      {vistaActual === 'registro' && (
        <Registro 
          cambiarAVistaLogin={() => setVistaActual('login')}
          onIngresoInvitado={handleIngresoInvitado}
        />
      )}

      {vistaActual === 'dashboard' && (
        <Dashboard 
          usuario={usuarioLogueado} 
          onCerrarSesion={handleCerrarSesion} 
          onActualizarUsuario={setUsuarioLogueado}
        />
      )}
    </>
  );
}

export default App;
import React, { useState } from 'react';
import Login from './vistas/Login';
import Registro from './vistas/Registro';
import Dashboard from './vistas/Dashboard';

export function App() {
  const [vistaActual, setVistaActual] = useState('login'); // 'login' | 'registro' | 'dashboard'
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);

  const handleLoginExitoso = (datosUsuario) => {
    setUsuarioLogueado(datosUsuario);
    setVistaActual('dashboard');
  };

  const handleIngresoInvitado = () => {
    setUsuarioLogueado({ nombre: 'Usuario de Prueba (Invitado)', email: 'test@processmonitor.local' });
    setVistaActual('dashboard');
  };

  const handleCerrarSesion = () => {
    setUsuarioLogueado(null);
    setVistaActual('login');
  };

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
        />
      )}
    </>
  );
}

export default App;
import React, { useState, useEffect, useCallback } from 'react';
import { obtenerMiembros, actualizarRolMiembro } from '../../services/miembros';
import { generarCodigoTelegram } from '../../services/authService';
import { MenuRoles } from './MenuRoles';
import { MenuGeneral } from './MenuGeneral';
import { MenuPerfil } from './MenuPerfil';
import './MenuAjustes.css';

// Todos los ajustes en una sola vista: Mi perfil (con Telegram), General (umbrales y tema) y Usuarios y roles
export const MenuAjustes = ({
  abierto,
  onCerrar,
  usuario,
  onActualizarUsuario,
  onUmbralesActualizados,
  onCerrarSesion
}) => {
  // Configuración General
  const [tema, setTema] = useState(() => localStorage.getItem('sysmonitor_tema') || 'oscuro');

  // Cerrar sesión pide una confirmación en el mismo botón
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  // Módulo de Roles y Miembros (Conectado a Base de Datos)
  const rolOperadorActual = usuario?.rol || 'Visualizador';
  const esAdmin = rolOperadorActual === 'Administrador';

  const [miembros, setMiembros] = useState([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [paginaActualRoles, setPaginaActualRoles] = useState(1);
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  const [mostrarModalNuevoMiembro, setMostrarModalNuevoMiembro] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Operador de Guardia');

  // Sincronizar y cargar miembros de la BBDD cuando se abren los ajustes
  const recargarMiembros = useCallback(async () => {
    setCargandoMiembros(true);
    try {
      const lista = await obtenerMiembros();
      setMiembros(lista);
    } catch (err) {
      console.error('Error al cargar miembros:', err);
    } finally {
      setCargandoMiembros(false);
    }
  }, []);

  useEffect(() => {
    if (abierto) {
      recargarMiembros();
    }
  }, [abierto, recargarMiembros]);

  // Aviso breve arriba del drawer (por ejemplo al cambiar un rol)
  const [alertaDescarga, setAlertaDescarga] = useState(null);

  // Telegram
  const [codigoTelegram, setCodigoTelegram] = useState(null);
  const [cargandoCodigo, setCargandoCodigo] = useState(false);

  const handleSolicitarCodigoTelegram = async () => {
    setCargandoCodigo(true);
    try {
      // { codigo, bot }: MenuPerfil arma con esto el link al bot
      setCodigoTelegram(await generarCodigoTelegram());
    } catch (err) {
      alert(err.message || "Error de red al conectar con el servidor.");
    } finally {
      setCargandoCodigo(false);
    }
  };

  // Sincronizar el perfil y rol real al abrir el drawer de ajustes
  useEffect(() => {
    const sincronizarRolFresco = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !abierto) return;

      try {
        const res = await fetch('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const datosFrescos = await res.json();
          if (onActualizarUsuario) {
            onActualizarUsuario(datosFrescos);
          }
        }
      } catch (e) {
        console.error("Error al sincronizar rol:", e);
      }
    };

    sincronizarRolFresco();
  }, [abierto, onActualizarUsuario]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('sysmonitor_tema', tema);
  }, [tema]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && abierto) onCerrar();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [abierto, onCerrar]);

  // Mientras el menú está abierto se oculta el scroll de la página de atrás
  useEffect(() => {
    if (!abierto) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto]);

  if (!abierto) return null;

  // Al cerrar el drawer se descarta la confirmación de cierre de sesión que hubiera quedado abierta
  const cerrarAjustes = () => {
    setConfirmarCierre(false);
    onCerrar();
  };

  const mostrarMensajeDescarga = (mensaje) => {
    setAlertaDescarga(mensaje);
    setTimeout(() => setAlertaDescarga(null), 3000);
  };

  // Gestión de miembros asíncrona conectada al Backend
  const handleCambiarRolMiembro = async (id, nuevoRolValor) => {
    if (!esAdmin) {
      alert("Acceso denegado: solo los Administradores pueden cambiar roles.");
      return;
    }

    try {
      await actualizarRolMiembro(id, nuevoRolValor);
      
      // Actualización optimista del estado local
      setMiembros((prev) =>
        prev.map((m) => (m.id === id ? { ...m, rol: nuevoRolValor } : m))
      );
      mostrarMensajeDescarga(`Rol actualizado con éxito en la base de datos.`);
    } catch (error) {
      alert(`No se pudo cambiar el rol: ${error.message}`);
      recargarMiembros(); // Revertir cambios si el backend rechazó la petición (ej. 403)
    }
  };

  const handleCambiarRolMasivo = async (nuevoRolValor) => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;

    try {
      for (const id of miembrosSeleccionados) {
        await actualizarRolMiembro(id, nuevoRolValor);
      }
      mostrarMensajeDescarga(`Roles actualizados para ${miembrosSeleccionados.length} miembros.`);
      setMiembrosSeleccionados([]);
      recargarMiembros();
    } catch (error) {
      alert(`Error en actualización masiva: ${error.message}`);
      recargarMiembros();
    }
  };

  const handleEliminarMiembro = (id, nombre) => {
    if (!esAdmin) return;
    alert("La baja de usuarios se gestiona directamente desde la base de datos.");
  };

  const handleEliminarSeleccionados = () => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;
    alert("La baja masiva de usuarios se gestiona directamente desde la base de datos.");
  };

  const handleToggleSelectAll = (miembrosPaginados) => {
    // Lógica de selección masiva
  };

  const handleToggleRowMember = (id) => {
    setMiembrosSeleccionados(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleCrearMiembro = (e) => {
    e.preventDefault();
    if (!esAdmin) return;
    alert("Utiliza el endpoint de registro general para dar de alta nuevos operadores.");
    setMostrarModalNuevoMiembro(false);
  };

  return (
    <div className="menu-ajustes-backdrop" onClick={(e) => { if (e.target === e.currentTarget) cerrarAjustes(); }}>
      <div className="menu-ajustes-drawer">
        <div className="ajustes-drawer-header">
          <div className="ajustes-titulo">
            <span className="icono-gear">⚙️</span>
            <h3>Configuración & Sistema</h3>
          </div>
          <button type="button" className="btn-cerrar-ajustes" onClick={cerrarAjustes}>✕</button>
        </div>

        {alertaDescarga && <div className="alerta-toast-descarga">{alertaDescarga}</div>}

        <div className="ajustes-drawer-contenido">
          <section className="seccion-ajustes">
            <h4 className="titulo-seccion-ajustes">👤 Mi perfil</h4>
            <MenuPerfil
              usuario={usuario}
              rolOperadorActual={rolOperadorActual}
              codigoTelegram={codigoTelegram}
              cargandoCodigo={cargandoCodigo}
              handleSolicitarCodigoTelegram={handleSolicitarCodigoTelegram}
              onActualizarUsuario={onActualizarUsuario}
            />
          </section>

          <section className="seccion-ajustes">
            <h4 className="titulo-seccion-ajustes">⚙️ General</h4>
            <MenuGeneral
              tema={tema}
              setTema={setTema}
              onUmbralesActualizados={onUmbralesActualizados}
              esAdmin={esAdmin}
            />
          </section>

          <section className="seccion-ajustes">
            <h4 className="titulo-seccion-ajustes">👥 Usuarios y roles</h4>
            <MenuRoles
              miembros={miembros}
              cargandoMiembros={cargandoMiembros}
              miembrosSeleccionados={miembrosSeleccionados}
              setMiembrosSeleccionados={setMiembrosSeleccionados}
              usuario={usuario}
              mostrarModalNuevoMiembro={mostrarModalNuevoMiembro}
              setMostrarModalNuevoMiembro={setMostrarModalNuevoMiembro}
              nuevoNombre={nuevoNombre}
              setNuevoNombre={setNuevoNombre}
              nuevoEmail={nuevoEmail}
              setNuevoEmail={setNuevoEmail}
              nuevoRol={nuevoRol}
              setNuevoRol={setNuevoRol}
              handleCrearMiembro={handleCrearMiembro}
              handleCambiarRolMiembro={handleCambiarRolMiembro}
              handleCambiarRolMasivo={handleCambiarRolMasivo}
              handleEliminarMiembro={handleEliminarMiembro}
              handleEliminarSeleccionados={handleEliminarSeleccionados}
              handleToggleSelectAll={handleToggleSelectAll}
              handleToggleRowMember={handleToggleRowMember}
              paginaActualRoles={paginaActualRoles}
              setPaginaActualRoles={setPaginaActualRoles}
              mostrarMensajeDescarga={mostrarMensajeDescarga}
            />
          </section>
        </div>

        <div className="ajustes-drawer-footer">
          {confirmarCierre ? (
            <div className="confirmar-cierre-sesion">
              <span>¿Seguro que querés cerrar sesión?</span>
              <div className="botones-confirmar-cierre">
                <button
                  type="button"
                  className="btn-cerrar-sesion"
                  onClick={() => {
                    onCerrar();
                    if (onCerrarSesion) onCerrarSesion();
                  }}
                >
                  Sí, cerrar sesión
                </button>
                <button type="button" className="btn-cancelar-cierre" onClick={() => setConfirmarCierre(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-cerrar-sesion" onClick={() => setConfirmarCierre(true)}>
              <span>🚪</span> <span>Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuAjustes;
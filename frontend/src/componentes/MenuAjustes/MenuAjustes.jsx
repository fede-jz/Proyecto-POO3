import React, { useState, useEffect, useCallback } from 'react';
import { obtenerMiembros, actualizarRolMiembro } from '../../services/miembros';
import { MenuRoles } from './MenuRoles';
import { MenuGeneral } from './MenuGeneral';
import { MenuExportacion } from './MenuExportacion';
import { MenuPerfil } from './MenuPerfil';
import './MenuAjustes.css';

export const MenuAjustes = ({
  abierto,
  onCerrar,
  procesos,
  alertas,
  cpuTotal,
  ramTotal,
  usuario,
  onActualizarUsuario,
  onUmbralesActualizados
}) => {
  const [seccionActiva, setSeccionActiva] = useState('roles');

  // Configuración General
  const [tema, setTema] = useState(() => localStorage.getItem('sysmonitor_tema') || 'oscuro');
  const [noMolestar, setNoMolestar] = useState(() => JSON.parse(localStorage.getItem('sysmonitor_no_molestar') || 'false'));
  const [horaInicioNoMolestar, setHoraInicioNoMolestar] = useState(() => localStorage.getItem('sysmonitor_no_molestar_inicio') || '22:00');
  const [horaFinNoMolestar, setHoraFinNoMolestar] = useState(() => localStorage.getItem('sysmonitor_no_molestar_fin') || '07:00');
  const [idioma, setIdioma] = useState('es');
  const [refrescoAuto, setRefrescoAuto] = useState(true);
  const [notificacionesTelegram, setNotificacionesTelegram] = useState(true);

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

  // Sincronizar y cargar miembros de la BBDD cuando se abre la sección de roles
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
    if (abierto && seccionActiva === 'roles') {
      recargarMiembros();
    }
  }, [abierto, seccionActiva, recargarMiembros]);

  // Exportación
  const hoyStr = new Date().toISOString().split('T')[0];
  const hace7DiasStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hace7DiasStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroSeveridadExport, setFiltroSeveridadExport] = useState('todas');
  const [alertaDescarga, setAlertaDescarga] = useState(null);

  // Telegram
  const [codigoTelegram, setCodigoTelegram] = useState(null);
  const [cargandoCodigo, setCargandoCodigo] = useState(false);

  const handleSolicitarCodigoTelegram = async () => {
    setCargandoCodigo(true);
    try {
      const respuesta = await fetch(`http://localhost:8000/auth/telegram/generar-codigo?usuario_id=${usuario.id}`, { method: "POST" });
      const data = await respuesta.json();
      if (respuesta.ok) {
        setCodigoTelegram(data.codigo);
      } else {
        alert(data.detail || "Error al generar el código");
      }
    } catch (err) {
      alert("Error de red al conectar con el servidor.");
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

  if (!abierto) return null;

  const mostrarMensajeDescarga = (mensaje) => {
    setAlertaDescarga(mensaje);
    setTimeout(() => setAlertaDescarga(null), 3000);
  };

  const handleCambioFechaFin = (valor) => setFechaFin(valor > hoyStr ? hoyStr : valor);
  const handleCambioFechaInicio = (valor) => setFechaInicio(valor > hoyStr ? hoyStr : valor);

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
    <div className="menu-ajustes-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="menu-ajustes-drawer">
        <div className="ajustes-drawer-header">
          <div className="ajustes-titulo">
            <span className="icono-gear">⚙️</span>
            <h3>Configuración & Sistema</h3>
          </div>
          <button type="button" className="btn-cerrar-ajustes" onClick={onCerrar}>✕</button>
        </div>

        {alertaDescarga && <div className="alerta-toast-descarga">{alertaDescarga}</div>}

        <div className="ajustes-nav-secciones">
          <button type="button" className={`tab-seccion ${seccionActiva === 'roles' ? 'activa' : ''}`} onClick={() => setSeccionActiva('roles')}>👥 Roles</button>
          <button type="button" className={`tab-seccion ${seccionActiva === 'general' ? 'activa' : ''}`} onClick={() => setSeccionActiva('general')}>⚙️ General</button>
          <button type="button" className={`tab-seccion ${seccionActiva === 'exportar' ? 'activa' : ''}`} onClick={() => setSeccionActiva('exportar')}>📊 Exportar</button>
          <button type="button" className={`tab-seccion ${seccionActiva === 'perfil' ? 'activa' : ''}`} onClick={() => setSeccionActiva('perfil')}>👤 Perfil</button>
        </div>

        <div className="ajustes-drawer-contenido">
          {seccionActiva === 'roles' && (
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
          )}

          {seccionActiva === 'general' && (
            <MenuGeneral
              tema={tema} setTema={setTema}
              noMolestar={noMolestar} setNoMolestar={setNoMolestar}
              horaInicioNoMolestar={horaInicioNoMolestar} setHoraInicioNoMolestar={setHoraInicioNoMolestar}
              horaFinNoMolestar={horaFinNoMolestar} setHoraFinNoMolestar={setHoraFinNoMolestar}
              idioma={idioma} setIdioma={setIdioma}
              refrescoAuto={refrescoAuto} setRefrescoAuto={setRefrescoAuto}
              notificacionesTelegram={notificacionesTelegram} setNotificacionesTelegram={setNotificacionesTelegram}
            onUmbralesActualizados={onUmbralesActualizados}
            />
          )}

          {seccionActiva === 'exportar' && (
            <MenuExportacion
              hoyStr={hoyStr} fechaInicio={fechaInicio} fechaFin={fechaFin}
              handleCambioFechaInicio={handleCambioFechaInicio} handleCambioFechaFin={handleCambioFechaFin}
              filtroSeveridadExport={filtroSeveridadExport} setFiltroSeveridadExport={setFiltroSeveridadExport}
              handleExportarGraficoPdf={() => {}} handleExportarGraficoSvg={() => {}} handleExportarGraficoPng={() => {}}
              handleExportarProcesosExcel={() => {}} handleExportarProcesosPdf={() => {}}
              handleExportarAlertasCsv={() => {}} handleExportarAlertasPdf={() => {}}
              handleInformeGeneralCompleto={() => {}} procesos={procesos} alertas={alertas}
            />
          )}

          {seccionActiva === 'perfil' && (
            <MenuPerfil
              usuario={usuario}
              rolOperadorActual={rolOperadorActual}
              codigoTelegram={codigoTelegram}
              cargandoCodigo={cargandoCodigo}
              handleSolicitarCodigoTelegram={handleSolicitarCodigoTelegram}
              onActualizarUsuario={onActualizarUsuario}
            />
          )}
        </div>

        <div className="ajustes-drawer-footer">
          <button type="button" className="btn-cerrar-sesion" onClick={() => { if (window.confirm('¿Cerrar sesión?')) { onCerrar(); } }}>
            <span>🚪</span> <span>Cerrar Sesión Segura</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuAjustes;
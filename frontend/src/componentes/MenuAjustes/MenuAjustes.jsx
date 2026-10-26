import React, { useState, useEffect } from 'react';
import { getStoredMiembros, saveStoredMiembros } from '../../services/miembros';
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

  // Módulo de Roles y Miembros
 // Módulo de Roles y Miembros - Usando el rol real de la BBDD del usuario logueado
  const rolOperadorActual = usuario?.rol || 'Visualizador';
  const esAdmin = rolOperadorActual === 'Administrador';

  const [miembros, setMiembros] = useState(() => getStoredMiembros());
  const [paginaActualRoles, setPaginaActualRoles] = useState(1);
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  const [mostrarModalNuevoMiembro, setMostrarModalNuevoMiembro] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Operador de Guardia');

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
      const token = localStorage.getItem('sysmonitor_token');
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
  }, [abierto]);

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

  const descargarBlob = (contenido, nombreArchivo, tipoMime) => {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensajeDescarga(`Archivo "${nombreArchivo}" generado con éxito.`);
  };

  // Funciones de exportación (las mismas que ya tenías)
  const handleExportarGraficoSvg = () => { /* ... */ };
  const handleExportarGraficoPng = () => { /* ... */ };
  const handleExportarGraficoPdf = () => { /* ... */ };
  const handleExportarProcesosExcel = () => { /* ... */ };
  const handleExportarProcesosPdf = () => { /* ... */ };
  const handleExportarAlertasCsv = () => { /* ... */ };
  const handleExportarAlertasPdf = () => { /* ... */ };
  const handleInformeGeneralCompleto = () => { /* ... */ };

  const handleCambioFechaFin = (valor) => setFechaFin(valor > hoyStr ? hoyStr : valor);
  const handleCambioFechaInicio = (valor) => setFechaInicio(valor > hoyStr ? hoyStr : valor);

  // Gestión de miembros
  const handleCambiarRolMiembro = (id, nuevoRolValor) => {
    if (!esAdmin) return;
    const actualizados = miembros.map((m) => (m.id === id ? { ...m, rol: nuevoRolValor } : m));
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    mostrarMensajeDescarga(`Rol actualizado.`);
  };

  const handleCambiarRolMasivo = (nuevoRolValor) => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;
    const actualizados = miembros.map((m) => miembrosSeleccionados.includes(m.id) ? { ...m, rol: nuevoRolValor } : m);
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    mostrarMensajeDescarga(`Rol actualizado para ${miembrosSeleccionados.length} miembros.`);
    setMiembrosSeleccionados([]);
  };

  const handleEliminarMiembro = (id, nombre) => {
    if (!esAdmin) return;
    if (window.confirm(`¿Confirmas la baja de "${nombre}"?`)) {
      const actualizados = miembros.filter((m) => m.id !== id);
      setMiembros(actualizados);
      saveStoredMiembros(actualizados);
      setMiembrosSeleccionados((prev) => prev.filter((s) => s !== id));
      mostrarMensajeDescarga(`Miembro eliminado.`);
    }
  };

  const handleEliminarSeleccionados = () => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;
    if (window.confirm(`¿Eliminar los ${miembrosSeleccionados.length} seleccionados?`)) {
      const actualizados = miembros.filter((m) => !miembrosSeleccionados.includes(m.id));
      setMiembros(actualizados);
      saveStoredMiembros(actualizados);
      setMiembrosSeleccionados([]);
      mostrarMensajeDescarga(`Miembros eliminados.`);
    }
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
    const nuevo = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      nombre: nuevoNombre.trim(),
      email: nuevoEmail.trim(),
      rol: nuevoRol,
      ultimaConexion: 'Pendiente',
      avatarIniciales: nuevoNombre.substring(0, 2).toUpperCase()
    };
    const actualizados = [nuevo, ...miembros];
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    mostrarMensajeDescarga(`Invitación enviada.`);
    setNuevoNombre('');
    setNuevoEmail('');
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
    miembrosSeleccionados={miembrosSeleccionados}
    setMiembrosSeleccionados={setMiembrosSeleccionados}
    usuario={usuario} // <--- Pasamos el usuario real
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
            />
          )}

          {seccionActiva === 'exportar' && (
            <MenuExportacion
              hoyStr={hoyStr} fechaInicio={fechaInicio} fechaFin={fechaFin}
              handleCambioFechaInicio={handleCambioFechaInicio} handleCambioFechaFin={handleCambioFechaFin}
              filtroSeveridadExport={filtroSeveridadExport} setFiltroSeveridadExport={setFiltroSeveridadExport}
              handleExportarGraficoPdf={handleExportarGraficoPdf} handleExportarGraficoSvg={handleExportarGraficoSvg} handleExportarGraficoPng={handleExportarGraficoPng}
              handleExportarProcesosExcel={handleExportarProcesosExcel} handleExportarProcesosPdf={handleExportarProcesosPdf}
              handleExportarAlertasCsv={handleExportarAlertasCsv} handleExportarAlertasPdf={handleExportarAlertasPdf}
              handleInformeGeneralCompleto={handleInformeGeneralCompleto} procesos={procesos} alertas={alertas}
            />
          )}

          {seccionActiva === 'perfil' && (
            <MenuPerfil
              usuario={usuario}
              rolOperadorActual={rolOperadorActual}
              codigoTelegram={codigoTelegram}
              cargandoCodigo={cargandoCodigo}
              handleSolicitarCodigoTelegram={handleSolicitarCodigoTelegram}
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
import React, { useState, useEffect } from 'react';
import { getStoredMiembros, saveStoredMiembros } from '../../services/miembros';
import './MenuAjustes.css';

const ELEMENTOS_POR_PAGINA_ROLES = 10;

export const MenuAjustes = ({
  abierto,
  onCerrar,
  procesos,
  alertas,
  cpuTotal,
  ramTotal,
  usuario, // <--- Recibir la prop usuario aquí DESDE EL DASHBOARD
}) => {
  const [seccionActiva, setSeccionActiva] = useState('roles');

  // Configuración General
  // 1. Tema Oscuro por defecto
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('sysmonitor_tema') || 'oscuro';
  });

  // 2. Modo No Molestar
  const [noMolestar, setNoMolestar] = useState(() => {
    const raw = localStorage.getItem('sysmonitor_no_molestar');
    return raw ? JSON.parse(raw) : false;
  });
  const [horaInicioNoMolestar, setHoraInicioNoMolestar] = useState(() => {
    return localStorage.getItem('sysmonitor_no_molestar_inicio') || '22:00';
  });
  const [horaFinNoMolestar, setHoraFinNoMolestar] = useState(() => {
    return localStorage.getItem('sysmonitor_no_molestar_fin') || '07:00';
  });

  const [idioma, setIdioma] = useState('es');
  const [refrescoAuto, setRefrescoAuto] = useState(true);
  const [notificacionesTelegram, setNotificacionesTelegram] = useState(true);

  // Módulo de Roles y Miembros
  // Rol del operador actual (Abril Ruiz). Permite alternar para verificar el comportamiento de permisos
  const [rolOperadorActual, setRolOperadorActual] = useState('Administrador');
  const esAdmin = rolOperadorActual === 'Administrador';

  const [miembros, setMiembros] = useState(() => getStoredMiembros());
  const [paginaActualRoles, setPaginaActualRoles] = useState(1);
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  // Formulario para agregar miembro
  const [mostrarModalNuevoMiembro, setMostrarModalNuevoMiembro] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Operador de Guardia');

  // Módulo de Exportación de Gráficos (Rango de fechas no mayor a hoy)
  const hoyStr = new Date().toISOString().split('T')[0];
  const hace7DiasStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hace7DiasStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroSeveridadExport, setFiltroSeveridadExport] = useState('todas');
  const [alertaDescarga, setAlertaDescarga] = useState(null);

  //==========================================
  // GESTIÓN DEL BOT TELEGRAM
  //==========================================

  const [codigoTelegram, setCodigoTelegram] = useState(null);
  const [cargandoCodigo, setCargandoCodigo] = useState(false);

  const handleSolicitarCodigoTelegram = async () => {
    setCargandoCodigo(true);
    try {
      const respuesta = await fetch(`http://localhost:8000/auth/telegram/generar-codigo?usuario_id=${usuario.id}`, {
        method: "POST"
      });
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

  // Aplicar tema en el DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('sysmonitor_tema', tema);
  }, [tema]);

  // Guardar configuración de No Molestar
  useEffect(() => {
    localStorage.setItem('sysmonitor_no_molestar', JSON.stringify(noMolestar));
    localStorage.setItem('sysmonitor_no_molestar_inicio', horaInicioNoMolestar);
    localStorage.setItem('sysmonitor_no_molestar_fin', horaFinNoMolestar);
  }, [noMolestar, horaInicioNoMolestar, horaFinNoMolestar]);

  // Escuchar Escape para cerrar
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && abierto) {
        onCerrar();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const mostrarMensajeDescarga = (mensaje) => {
    setAlertaDescarga(mensaje);
    setTimeout(() => setAlertaDescarga(null), 3000);
  };

  // Helper para descargar archivos en el navegador
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
    mostrarMensajeDescarga(`Archivo "${nombreArchivo}" generado y descargado con éxito.`);
  };

  // 1. Exportar Gráficos: SVG
  const handleExportarGraficoSvg = () => {
    const svgOriginal = document.querySelector('.svg-poligono');
    if (!svgOriginal) {
      mostrarMensajeDescarga('Error: No se encontró el gráfico vectorial en pantalla.');
      return;
    }
    const svgXml = new XMLSerializer().serializeToString(svgOriginal);
    const contenidoCompleto = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por SysMonitor Monitoreo de Procesos [${fechaInicio} a ${fechaFin}] -->
${svgXml}`;
    descargarBlob(contenidoCompleto, `grafico-consumo-${fechaFin}.svg`, 'image/svg+xml');
  };

  // 2. Exportar Gráficos: PNG
  const handleExportarGraficoPng = () => {
    const svgElement = document.querySelector('.svg-poligono');
    if (!svgElement) {
      mostrarMensajeDescarga('Error: No se encontró el gráfico vectorial.');
      return;
    }
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#090C10';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 50, 50, 1100, 500);

        context.fillStyle = '#38bdf8';
        context.font = 'bold 20px sans-serif';
        context.fillText(`SysMonitor • Historial de Recursos (${fechaInicio} a ${fechaFin})`, 60, 40);

        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `grafico-consumo-${fechaFin}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
            mostrarMensajeDescarga('Gráfico PNG descargado con éxito.');
          }
        }, 'image/png');
      }
    };
    image.src = blobURL;
  };

  // 3. Exportar Gráficos: PDF
  const handleExportarGraficoPdf = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const svgOriginal = document.querySelector('.svg-poligono')?.outerHTML || '';
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Gráficos de Recursos</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; background: #fff; color: #111; }
            h1 { color: #0284c7; }
            .meta { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
            .grafico-caja { background: #0f172a; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
            .metricas { display: flex; gap: 2rem; margin-top: 1rem; }
            .card { background: #f1f5f9; padding: 1rem; border-radius: 6px; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <h1>SysMonitor — Reporte de Recursos del Sistema</h1>
          <div class="meta">Rango de fechas: ${fechaInicio} a ${fechaFin} | Generado el: ${new Date().toLocaleString()}</div>
          <div class="metricas">
            <div class="card"><strong>CPU Promedio:</strong> ${cpuTotal}%</div>
            <div class="card"><strong>RAM Promedio:</strong> ${ramTotal}%</div>
            <div class="card"><strong>Total Procesos:</strong> ${procesos.length}</div>
          </div>
          <div class="grafico-caja">
            ${svgOriginal}
          </div>
          <p style="font-size: 0.8rem; color: #888;">Reporte generado automáticamente por SysMonitor. Válido para auditoría técnica.</p>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    ventana.document.close();
    mostrarMensajeDescarga('Vista de impresión PDF abierta correctamente.');
  };

  // 4. Exportar Procesos: EXCEL (CSV con UTF-8 BOM)
  const handleExportarProcesosExcel = () => {
    const BOM = '\uFEFF';
    let csv = `${BOM}Proceso;PIDs;CPU (%);RAM (%);Etiquetas\n`;
    procesos.forEach((p) => {
      const pidsStr = p.pids ? p.pids.join(', ') : '';
      const tagsStr = p.tags ? p.tags.join(', ') : '';
      csv += `"${p.name}";"${pidsStr}";"${p.cpu_percent}";"${p.memory_percent}";"${tagsStr}"\n`;
    });
    descargarBlob(csv, `procesos-${hoyStr}.csv`, 'text/csv;charset=utf-8');
  };

  // 5. Exportar Procesos: PDF
  const handleExportarProcesosPdf = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const filasHtml = procesos
      .map(
        (p) => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.pids ? p.pids.join(', ') : 'N/A'}</td>
        <td style="text-align: right; color: #b45309;">${p.cpu_percent}%</td>
        <td style="text-align: right; color: #047857;">${p.memory_percent}%</td>
        <td>${p.tags && p.tags.length > 0 ? p.tags.join(', ') : '—'}</td>
      </tr>
    `
      )
      .join('');

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventario de Procesos Activos</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; color: #111; }
            h2 { color: #0369a1; margin-bottom: 0.25rem; }
            p { color: #64748b; font-size: 0.85rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 0.85rem; }
            th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
            th { background: #f8fafc; color: #334155; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>SysMonitor — Inventario de Procesos del Sistema</h2>
          <p>Emitido el: ${new Date().toLocaleString()} | Total de procesos agrupados: ${procesos.length}</p>
          <table>
            <thead>
              <tr>
                <th>Proceso</th>
                <th>PIDs Asociados</th>
                <th style="text-align: right;">CPU (%)</th>
                <th style="text-align: right;">RAM (%)</th>
                <th>Etiquetas</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    ventana.document.close();
    mostrarMensajeDescarga('Reporte PDF de procesos listo para guardar o imprimir.');
  };

  // 6. Exportar Alertas: CSV / EXCEL
  const handleExportarAlertasCsv = () => {
    const BOM = '\uFEFF';
    let csv = `${BOM}ID Alerta;ID Proceso;Proceso;Tipo;Severidad;Estado Telegram;Fecha y Horario;Observaciones Técnicas\n`;

    const filtradas = alertas.filter(
      (a) => filtroSeveridadExport === 'todas' || a.severidad.toLowerCase() === filtroSeveridadExport.toLowerCase()
    );

    filtradas.forEach((a) => {
      const obs = (a.observaciones || '').replace(/"/g, '""');
      csv += `"${a.id}";"${a.procesoId}";"${a.procesoNombre}";"${a.tipo}";"${a.severidad}";"${a.estadoEntrega}";"${a.fechaHora}";"${obs}"\n`;
    });
    descargarBlob(csv, `alertas-sistema-${hoyStr}.csv`, 'text/csv;charset=utf-8');
  };

  // 7. Exportar Alertas: PDF
  const handleExportarAlertasPdf = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const filtradas = alertas.filter(
      (a) => filtroSeveridadExport === 'todas' || a.severidad.toLowerCase() === filtroSeveridadExport.toLowerCase()
    );

    const filasHtml = filtradas
      .map(
        (a) => `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td>${a.procesoNombre} (${a.procesoId})</td>
        <td>${a.tipo}</td>
        <td><span style="color: ${a.severidad === 'Crítico' || a.severidad === 'Alto' ? '#b91c1c' : '#047857'}; font-weight: bold;">${a.severidad}</span></td>
        <td>${a.estadoEntrega}</td>
        <td>${a.fechaHora}</td>
        <td>${a.observaciones || '—'}</td>
      </tr>
    `
      )
      .join('');

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Registro Histórico de Alertas</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; color: #111; }
            h2 { color: #b91c1c; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.8rem; }
            th, td { border: 1px solid #cbd5e1; padding: 0.4rem 0.6rem; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>SysMonitor — Bitácora Oficial de Alertas</h2>
          <p style="color: #64748b; font-size: 0.85rem;">Filtro de severidad: ${filtroSeveridadExport.toUpperCase()} | Total eventos: ${filtradas.length}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Proceso</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>Estado Telegram</th>
                <th>Fecha y Hora</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    ventana.document.close();
    mostrarMensajeDescarga('Bitácora PDF de alertas abierta para impresión.');
  };

  // 8. Informe General Completo
  const handleInformeGeneralCompleto = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const tablaProcesosResumen = procesos
      .slice(0, 10)
      .map(
        (p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.cpu_percent}%</td>
        <td>${p.memory_percent}%</td>
        <td>${p.tags?.join(', ') || '—'}</td>
      </tr>
    `
      )
      .join('');

    const tablaAlertasResumen = alertas
      .slice(0, 8)
      .map(
        (a) => `
      <tr>
        <td>${a.id}</td>
        <td>${a.tipo}</td>
        <td>${a.severidad}</td>
        <td>${a.estadoEntrega}</td>
        <td>${a.fechaHora}</td>
      </tr>
    `
      )
      .join('');

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe General Ejecutivo del Sistema</title>
          <style>
            body { font-family: sans-serif; padding: 2.5rem; color: #0f172a; line-height: 1.5; }
            .header-report { border-bottom: 2px solid #0284c7; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            h1 { margin: 0; color: #0284c7; font-size: 1.75rem; }
            .resumen-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
            .res-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
            .res-val { font-size: 1.5rem; font-weight: bold; color: #0284c7; }
            table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1.5rem; }
            th, td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
            th { background: #f1f5f9; }
            h3 { color: #1e293b; margin-top: 1.5rem; border-left: 4px solid #0284c7; padding-left: 0.5rem; }
            .firma { margin-top: 3rem; display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header-report">
            <h1>SysMonitor • Informe Ejecutivo de Infraestructura</h1>
            <div>Operador: Abril Ruiz (${rolOperadorActual}) | Fecha de emisión: ${new Date().toLocaleString()}</div>
          </div>

          <div class="resumen-cards">
            <div class="res-card">
              <div>Consumo Total CPU</div>
              <div class="res-val">${cpuTotal}%</div>
            </div>
            <div class="res-card">
              <div>Consumo Total RAM</div>
              <div class="res-val">${ramTotal}%</div>
            </div>
            <div class="res-card">
              <div>Procesos Únicos Activos</div>
              <div class="res-val">${procesos.length}</div>
            </div>
          </div>

          <h3>Top 10 Procesos en Ejecución</h3>
          <table>
            <thead><tr><th>Proceso</th><th>CPU</th><th>RAM</th><th>Etiquetas</th></tr></thead>
            <tbody>${tablaProcesosResumen}</tbody>
          </table>

          <h3>Últimas Alertas y Notificaciones a Telegram</h3>
          <table>
            <thead><tr><th>ID</th><th>Tipo</th><th>Severidad</th><th>Estado Telegram</th><th>Fecha/Hora</th></tr></thead>
            <tbody>${tablaAlertasResumen}</tbody>
          </table>

          <div class="firma">
            <div>Firma de Responsable Técnico: _________________________</div>
            <div>Sello de Auditoría: APROBADO</div>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    ventana.document.close();
    mostrarMensajeDescarga('Informe Ejecutivo General generado exitosamente.');
  };

  // Manejo de fechas de exportación
  const handleCambioFechaFin = (valor) => {
    if (valor > hoyStr) {
      setFechaFin(hoyStr);
    } else {
      setFechaFin(valor);
    }
  };

  const handleCambioFechaInicio = (valor) => {
    if (valor > hoyStr) {
      setFechaInicio(hoyStr);
    } else {
      setFechaInicio(valor);
    }
  };

  // =========================================
  // GESTIÓN DE MIEMBROS Y ROLES (ADMIN ONLY)
  // =========================================

  // Paginación fija de 10 en 10 estilo Gmail
  const totalMiembros = miembros.length;
  const totalPaginasRoles = Math.max(1, Math.ceil(totalMiembros / ELEMENTOS_POR_PAGINA_ROLES));
  const paginaValidaRoles = Math.min(Math.max(1, paginaActualRoles), totalPaginasRoles);

  const indiceInicioRoles = (paginaValidaRoles - 1) * ELEMENTOS_POR_PAGINA_ROLES;
  const indiceFinRoles = Math.min(indiceInicioRoles + ELEMENTOS_POR_PAGINA_ROLES, totalMiembros);
  const miembrosPaginados = miembros.slice(indiceInicioRoles, indiceFinRoles);

  const rangoTextoRoles =
    totalMiembros === 0
      ? '0 de 0 miembros'
      : `${indiceInicioRoles + 1}–${indiceFinRoles} de ${totalMiembros} miembros`;

  // Checkbox global de selección
  const todosSeleccionados =
    miembrosPaginados.length > 0 &&
    miembrosPaginados.every((m) => miembrosSeleccionados.includes(m.id));
  const algunosSeleccionados =
    miembrosPaginados.some((m) => miembrosSeleccionados.includes(m.id)) && !todosSeleccionados;

  const handleToggleSelectAll = () => {
    if (todosSeleccionados) {
      const idsPagina = new Set(miembrosPaginados.map((m) => m.id));
      setMiembrosSeleccionados(miembrosSeleccionados.filter((id) => !idsPagina.has(id)));
    } else {
      const nuevoSet = new Set([...miembrosSeleccionados, ...miembrosPaginados.map((m) => m.id)]);
      setMiembrosSeleccionados(Array.from(nuevoSet));
    }
  };

  const handleToggleRowMember = (id) => {
    if (miembrosSeleccionados.includes(id)) {
      setMiembrosSeleccionados(miembrosSeleccionados.filter((s) => s !== id));
    } else {
      setMiembrosSeleccionados([...miembrosSeleccionados, id]);
    }
  };

  // Cambiar rol de un miembro individual (Admin only)
  const handleCambiarRolMiembro = (id, nuevoRolValor) => {
    if (!esAdmin) return;
    const actualizados = miembros.map((m) => (m.id === id ? { ...m, rol: nuevoRolValor } : m));
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    mostrarMensajeDescarga(`Rol actualizado para el miembro.`);
  };

  // Cambiar rol masivo a seleccionados (Admin only)
  const handleCambiarRolMasivo = (nuevoRolValor) => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;
    const actualizados = miembros.map((m) =>
      miembrosSeleccionados.includes(m.id) ? { ...m, rol: nuevoRolValor } : m
    );
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    mostrarMensajeDescarga(`Rol "${nuevoRolValor}" asignado a ${miembrosSeleccionados.length} miembros.`);
    setMiembrosSeleccionados([]);
  };

  // Eliminar miembro individual (Admin only)
  const handleEliminarMiembro = (id, nombre) => {
    if (!esAdmin) return;
    if (window.confirm(`¿Confirmas la baja del miembro "${nombre}" del sistema?`)) {
      const actualizados = miembros.filter((m) => m.id !== id);
      setMiembros(actualizados);
      saveStoredMiembros(actualizados);
      setMiembrosSeleccionados((prev) => prev.filter((s) => s !== id));
      mostrarMensajeDescarga(`Miembro "${nombre}" eliminado del sistema.`);
    }
  };

  // Eliminar miembros seleccionados (Admin only)
  const handleEliminarSeleccionados = () => {
    if (!esAdmin || miembrosSeleccionados.length === 0) return;
    if (window.confirm(`¿Deseas eliminar los ${miembrosSeleccionados.length} miembros seleccionados?`)) {
      const actualizados = miembros.filter((m) => !miembrosSeleccionados.includes(m.id));
      setMiembros(actualizados);
      saveStoredMiembros(actualizados);
      setMiembrosSeleccionados([]);
      mostrarMensajeDescarga(`${miembrosSeleccionados.length} miembros eliminados.`);
    }
  };

  // Agregar nuevo miembro (Admin only)
  const handleCrearMiembro = (e) => {
    e.preventDefault();
    if (!esAdmin) return;
    const nombreLimpio = nuevoNombre.trim();
    const emailLimpio = nuevoEmail.trim();
    if (!nombreLimpio || !emailLimpio) return;

    // Aquí podrías agregar lógica para verificar si el usuario existe en tu BD principal de Supabase
    
    const iniciales = nombreLimpio
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const nuevo = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      nombre: nombreLimpio,
      email: emailLimpio,
      rol: nuevoRol,
      ultimaConexion: 'Pendiente de aceptación',
      avatarIniciales: iniciales || 'US',
    };

    const actualizados = [nuevo, ...miembros];
    setMiembros(actualizados);
    saveStoredMiembros(actualizados);
    
    // Simulación de envío de invitación por Telegram
    mostrarMensajeDescarga(`Invitación enviada vía Telegram a ${nombreLimpio}.`);
    
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoRol('Operador de Guardia');
    setMostrarModalNuevoMiembro(false);
  };

  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'Administrador':
        return <span className="badge-rol rol-admin">Administrador</span>;
      case 'Operador de Guardia':
        return <span className="badge-rol rol-operador">Operador de Guardia</span>;
      case 'Visualizador':
      default:
        return <span className="badge-rol rol-visualizador">Visualizador</span>;
    }
  };

  return (
    <div
      className="menu-ajustes-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="menu-ajustes-drawer">
        {/* Cabecera del Drawer */}
        <div className="ajustes-drawer-header">
          <div className="ajustes-titulo">
            <span className="icono-gear">⚙️</span>
            <h3>Configuración & Sistema</h3>
          </div>
          <button type="button" className="btn-cerrar-ajustes" onClick={onCerrar} title="Cerrar panel (Esc)">
            ✕
          </button>
        </div>

        {/* Notificación de Descarga */}
        {alertaDescarga && <div className="alerta-toast-descarga">{alertaDescarga}</div>}

        {/* Pestañas de Secciones */}
        <div className="ajustes-nav-secciones">
          <button
            type="button"
            className={`tab-seccion ${seccionActiva === 'roles' ? 'activa' : ''}`}
            onClick={() => setSeccionActiva('roles')}
          >
            👥 Roles y Miembros
          </button>
          <button
            type="button"
            className={`tab-seccion ${seccionActiva === 'general' ? 'activa' : ''}`}
            onClick={() => setSeccionActiva('general')}
          >
            ⚙️ General
          </button>
          <button
            type="button"
            className={`tab-seccion ${seccionActiva === 'exportar' ? 'activa' : ''}`}
            onClick={() => setSeccionActiva('exportar')}
          >
            📊 Exportación
          </button>
          <button
            type="button"
            className={`tab-seccion ${seccionActiva === 'perfil' ? 'activa' : ''}`}
            onClick={() => setSeccionActiva('perfil')}
          >
            👤 Perfil
          </button>
        </div>

        {/* Contenido según Sección Activa */}
        <div className="ajustes-drawer-contenido">
          {/* =========================================
              SECCIÓN: GESTIÓN DE ROLES Y MIEMBROS
              ========================================= */}
          {seccionActiva === 'roles' && (
            <div className="modulo-roles-miembros">
              {/* Barra de Simulación del Operador Activo */}
              <div className="card-operador-activo">
                <div className="operador-activo-left">
                  <div className="avatar-mini-operador">AR</div>
                  <div className="operador-textos">
                    <span className="operador-sub">Operador en sesión:</span>
                    <strong>Abril Ruiz</strong>
                  </div>
                </div>

                <div className="operador-rol-toggle">
                  <span className="label-simulacion">Rol activo:</span>
                  <select
                    value={rolOperadorActual}
                    onChange={(e) => {
                      const nuevo = e.target.value;
                      setRolOperadorActual(nuevo);
                      setMiembrosSeleccionados([]);
                      mostrarMensajeDescarga(`Modo de vista cambiado a: ${nuevo}`);
                    }}
                    className="select-rol-operador"
                    title="Alterna el rol del operador para verificar el comportamiento de permisos"
                  >
                    <option value="Administrador">Administrador (Total)</option>
                    <option value="Operador de Guardia">Operador de Guardia</option>
                    <option value="Visualizador">Visualizador (Lectura)</option>
                  </select>
                </div>
              </div>

              {/* Banner de Estado de Permisos */}
              {!esAdmin ? (
                <div className="banner-permiso-solo-lectura">
                  <span className="icono-candado">🔒</span>
                  <div>
                    <strong>Modo Solo Lectura</strong>
                    <p>
                      Has iniciado sesión como <em>{rolOperadorActual}</em>. Solo los usuarios con rol{' '}
                      <strong>Administrador</strong> tienen permisos para asignar roles, agregar o remover miembros.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="banner-permiso-admin">
                  <div className="admin-status-text">
                    <span className="icono-corona">👑</span>
                    <span>Modo Administrador Activo: Permisos completos de edición y gestión.</span>
                  </div>
                  <button
                    type="button"
                    className="btn-abrir-nuevo-miembro"
                    onClick={() => setMostrarModalNuevoMiembro(!mostrarModalNuevoMiembro)}
                  >
                    {mostrarModalNuevoMiembro ? '✕ Cerrar' : '+ Nuevo Miembro'}
                  </button>
                </div>
              )}

              {/* Formulario Modal/Inline para Agregar Miembro (Solo Administrador) */}
              {esAdmin && mostrarModalNuevoMiembro && (
                <form className="form-nuevo-miembro" onSubmit={handleCrearMiembro}>
                  <h5>Dar de alta nuevo miembro</h5>
                  <div className="form-miembro-grid">
                    <input
                      type="text"
                      placeholder="Nombre y Apellido (ej. Lucas Benítez)"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="input-miembro"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Correo institucional (@sysmonitor.net)"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      className="input-miembro"
                      required
                    />
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      className="input-miembro select-rol-nuevo"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Operador de Guardia">Operador de Guardia</option>
                      <option value="Visualizador">Visualizador</option>
                    </select>
                  </div>
                  <div className="form-miembro-acciones">
                    <button type="submit" className="btn-guardar-miembro">
                      Guardar Miembro
                    </button>
                    <button
                      type="button"
                      className="btn-cancelar-miembro"
                      onClick={() => setMostrarModalNuevoMiembro(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Barra de Acciones Masivas (Solo Administrador) */}
              {esAdmin && miembrosSeleccionados.length > 0 && (
                <div className="barra-acciones-miembros">
                  <div className="info-sel-miembros">
                    <span className="badge-sel-num">{miembrosSeleccionados.length}</span>
                    <span>miembros seleccionados</span>
                  </div>

                  <div className="botones-sel-miembros">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleCambiarRolMasivo(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="select-cambio-masivo"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Cambiar Rol a...
                      </option>
                      <option value="Administrador">Administrador</option>
                      <option value="Operador de Guardia">Operador de Guardia</option>
                      <option value="Visualizador">Visualizador</option>
                    </select>

                    <button
                      type="button"
                      className="btn-eliminar-masivo"
                      onClick={handleEliminarSeleccionados}
                    >
                      🗑️ Eliminar
                    </button>

                    <button
                      type="button"
                      className="btn-limpiar-sel-miembros"
                      onClick={() => setMiembrosSeleccionados([])}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla de Miembros */}
              <div className="tabla-miembros-wrapper">
                <table className="tabla-miembros">
                  <thead>
                    <tr>
                      {esAdmin && (
                        <th className="th-check-miembro">
                          <label className="checkbox-miembro-container">
                            <input
                              type="checkbox"
                              checked={todosSeleccionados}
                              ref={(el) => {
                                if (el) el.indeterminate = algunosSeleccionados;
                              }}
                              onChange={handleToggleSelectAll}
                            />
                            <span className="checkbox-miembro-box"></span>
                          </label>
                        </th>
                      )}
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Última Conexión</th>
                      {esAdmin && <th className="th-acciones-admin">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {miembrosPaginados.length > 0 ? (
                      miembrosPaginados.map((m) => {
                        const estaSeleccionado = miembrosSeleccionados.includes(m.id);
                        return (
                          <tr
                            key={m.id}
                            className={`fila-miembro ${estaSeleccionado ? 'fila-miembro-sel' : ''}`}
                          >
                            {/* Checkbox solo visible para Administrador */}
                            {esAdmin && (
                              <td
                                className="td-check-miembro"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRowMember(m.id);
                                }}
                              >
                                <label
                                  className="checkbox-miembro-container"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={estaSeleccionado}
                                    onChange={() => handleToggleRowMember(m.id)}
                                  />
                                  <span className="checkbox-miembro-box"></span>
                                </label>
                              </td>
                            )}

                            {/* Usuario con Avatar e identificador */}
                            <td className="td-usuario-info">
                              <div className="usuario-celda">
                                <span className="avatar-iniciales">{m.avatarIniciales}</span>
                                <div className="usuario-textos-col">
                                  <span className="usuario-nombre">{m.nombre}</span>
                                  <span className="usuario-correo">{m.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Rol: Badge o selector según privilegios */}
                            <td className="td-rol-celda">
                              {esAdmin ? (
                                <select
                                  value={m.rol}
                                  onChange={(e) =>
                                    handleCambiarRolMiembro(m.id, e.target.value)
                                  }
                                  className="select-rol-en-tabla"
                                  title="Haz clic para modificar el rol de este miembro"
                                >
                                  <option value="Administrador">Administrador</option>
                                  <option value="Operador de Guardia">Operador de Guardia</option>
                                  <option value="Visualizador">Visualizador</option>
                                </select>
                              ) : (
                                renderBadgeRol(m.rol)
                              )}
                            </td>

                            {/* Última Conexión */}
                            <td className="td-conexion font-mono">{m.ultimaConexion}</td>

                            {/* Acciones (solo Administrador) */}
                            {esAdmin && (
                              <td className="td-acciones-admin">
                                <button
                                  type="button"
                                  className="btn-eliminar-fila"
                                  onClick={() => handleEliminarMiembro(m.id, m.nombre)}
                                  title={`Eliminar a ${m.nombre} de la plataforma`}
                                >
                                  🗑️
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={esAdmin ? 5 : 3} className="sin-miembros">
                          No hay miembros registrados en este momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Paginación fija de 10 en 10 estilo Gmail */}
                <div className="paginacion-roles-gmail">
                  <div className="info-paginacion-roles">
                    <span className="rango-roles font-mono">{rangoTextoRoles}</span>
                    <span className="pagina-roles">(Página {paginaValidaRoles} de {totalPaginasRoles})</span>
                  </div>

                  <div className="controles-paginacion-roles">
                    <button
                      type="button"
                      className="btn-pag-nav-roles"
                      disabled={paginaValidaRoles <= 1}
                      onClick={() => setPaginaActualRoles((prev) => Math.max(1, prev - 1))}
                      title="Página anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn-pag-nav-roles"
                      disabled={paginaValidaRoles >= totalPaginasRoles || totalMiembros === 0}
                      onClick={() => setPaginaActualRoles((prev) => Math.min(totalPaginasRoles, prev + 1))}
                      title="Página siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              SECCIÓN: CONFIGURACIÓN GENERAL
              ========================================= */}
          {seccionActiva === 'general' && (
            <div className="seccion-general-container">
              {/* Tema de Interfaz (Modo Oscuro por defecto) */}
              <div className="card-ajuste-opcion">
                <div className="opcion-texto">
                  <strong>Tema de Interfaz</strong>
                  <span>Por defecto en <strong>Modo Oscuro</strong> para monitoreo 24/7 continuo</span>
                </div>
                <div className="selector-tema-botones">
                  <button
                    type="button"
                    className={`btn-tema ${tema === 'oscuro' ? 'activo' : ''}`}
                    onClick={() => setTema('oscuro')}
                  >
                    🌙 Oscuro (Default)
                  </button>
                  <button
                    type="button"
                    className={`btn-tema ${tema === 'claro' ? 'activo' : ''}`}
                    onClick={() => setTema('claro')}
                  >
                    ☀️ Claro
                  </button>
                </div>
              </div>

              {/* Modo No Molestar con Rango Horario */}
              <div className="card-ajuste-opcion no-molestar-card">
                <div className="opcion-header-switch">
                  <div className="opcion-texto">
                    <strong>Modo No Molestar</strong>
                    <span>
                      Silencia automáticamente las notificaciones y alertas que no sean críticas durante este intervalo.
                    </span>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      checked={noMolestar}
                      onChange={(e) => setNoMolestar(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                {noMolestar ? (
                  <div className="no-molestar-horarios-box">
                    <div className="horarios-grid">
                      <div className="campo-hora">
                        <label>Hora de Inicio:</label>
                        <input
                          type="time"
                          value={horaInicioNoMolestar}
                          onChange={(e) => setHoraInicioNoMolestar(e.target.value)}
                          className="input-hora"
                        />
                      </div>
                      <div className="campo-hora">
                        <label>Hora de Fin:</label>
                        <input
                          type="time"
                          value={horaFinNoMolestar}
                          onChange={(e) => setHoraFinNoMolestar(e.target.value)}
                          className="input-hora"
                        />
                      </div>
                    </div>
                    <div className="badge-estado-no-molestar">
                      <span>🌙 Silencioso programado: {horaInicioNoMolestar} a {horaFinNoMolestar}</span>
                      <small>(Solo eventos con severidad Crítica emitirán notificación auditiva)</small>
                    </div>
                  </div>
                ) : (
                  <div className="aviso-desactivado">
                    <span>Modo No Molestar desactivado. Todas las alertas se transmitirán normalmente.</span>
                  </div>
                )}
              </div>

              <div className="card-ajuste-opcion">
                <div className="opcion-texto">
                  <strong>Idioma del Sistema</strong>
                  <span>Lenguaje de menús y reportes exportados</span>
                </div>
                <select
                  value={idioma}
                  onChange={(e) => setIdioma(e.target.value)}
                  className="select-idioma"
                >
                  <option value="es">Español (ES)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="card-ajuste-opcion">
                <div className="opcion-texto">
                  <strong>Refresco Automático (5 segundos)</strong>
                  <span>Sondeo continuo de procesos del sistema operativo</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={refrescoAuto}
                    onChange={(e) => setRefrescoAuto(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="card-ajuste-opcion">
                <div className="opcion-texto">
                  <strong>Transmisión de Alertas a Telegram</strong>
                  <span>Envío inmediato al superar umbrales de CPU/RAM</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={notificacionesTelegram}
                    onChange={(e) => setNotificacionesTelegram(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>
          )}

          {/* =========================================
              SECCIÓN: MÓDULO DE EXPORTACIÓN DE INFORMES
              ========================================= */}
          {seccionActiva === 'exportar' && (
            <div className="modulo-exportacion-container">
              <div className="export-intro-card">
                <h4>Centro de Exportación de Datos e Informes</h4>
                <p>Descarga telemetría, métricas de consumo y bitácoras para auditoría técnica o informes de guardia.</p>
              </div>

              {/* Botón Maestro: Informe General Completo */}
              <div className="card-informe-completo">
                <div className="informe-completo-info">
                  <h5>📑 Informe Ejecutivo General Completo</h5>
                  <p>Consolida métricas globales, top de procesos en ejecución y registro de alertas Telegram.</p>
                </div>
                <button
                  type="button"
                  className="btn-descarga-destacado"
                  onClick={handleInformeGeneralCompleto}
                >
                  Generar Informe PDF Completo
                </button>
              </div>

              {/* Card 1: Exportar Gráficos */}
              <div className="card-export-grupo">
                <div className="grupo-header">
                  <span className="grupo-icono">📈</span>
                  <div className="grupo-textos">
                    <h5>Exportar Gráficos de Consumo</h5>
                    <p>Filtro por rango de fechas (máximo fecha actual: {hoyStr})</p>
                  </div>
                </div>

                <div className="rango-fechas-grid">
                  <div className="campo-fecha">
                    <label>Desde:</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      max={hoyStr}
                      onChange={(e) => handleCambioFechaInicio(e.target.value)}
                      className="input-fecha"
                    />
                  </div>
                  <div className="campo-fecha">
                    <label>Hasta (Máx hoy):</label>
                    <input
                      type="date"
                      value={fechaFin}
                      max={hoyStr}
                      onChange={(e) => handleCambioFechaFin(e.target.value)}
                      className="input-fecha"
                    />
                  </div>
                </div>

                <div className="botones-descarga-fila">
                  <button type="button" className="btn-formato btn-pdf" onClick={handleExportarGraficoPdf}>
                    Descargar PDF
                  </button>
                  <button type="button" className="btn-formato btn-svg" onClick={handleExportarGraficoSvg}>
                    Descargar SVG
                  </button>
                  <button type="button" className="btn-formato btn-png" onClick={handleExportarGraficoPng}>
                    Descargar PNG
                  </button>
                </div>
              </div>

              {/* Card 2: Exportar Procesos */}
              <div className="card-export-grupo">
                <div className="grupo-header">
                  <span className="grupo-icono">⚡</span>
                  <div className="grupo-textos">
                    <h5>Exportar Inventario de Procesos</h5>
                    <p>Descarga la lista de {procesos.length} procesos activos con consumos de CPU, RAM y etiquetas.</p>
                  </div>
                </div>

                <div className="botones-descarga-fila">
                  <button type="button" className="btn-formato btn-excel" onClick={handleExportarProcesosExcel}>
                    Descargar EXCEL (CSV)
                  </button>
                  <button type="button" className="btn-formato btn-pdf" onClick={handleExportarProcesosPdf}>
                    Descargar PDF
                  </button>
                </div>
              </div>

              {/* Card 3: Exportar Alertas */}
              <div className="card-export-grupo">
                <div className="grupo-header">
                  <span className="grupo-icono">🔔</span>
                  <div className="grupo-textos">
                    <h5>Exportar Registro de Alertas</h5>
                    <p>Bitácora de eventos y transmisiones a Telegram ({alertas.length} registros)</p>
                  </div>
                </div>

                <div className="filtro-severidad-export">
                  <label>Filtrar por Severidad:</label>
                  <select
                    value={filtroSeveridadExport}
                    onChange={(e) => setFiltroSeveridadExport(e.target.value)}
                    className="select-export-filtro"
                  >
                    <option value="todas">Todas las severidades</option>
                    <option value="crítico">Críticas</option>
                    <option value="alto">Altas</option>
                    <option value="medio">Medias</option>
                    <option value="bajo">Bajas</option>
                  </select>
                </div>

                <div className="botones-descarga-fila">
                  <button type="button" className="btn-formato btn-excel" onClick={handleExportarAlertasCsv}>
                    Descargar EXCEL
                  </button>
                  <button type="button" className="btn-formato btn-csv" onClick={handleExportarAlertasCsv}>
                    Descargar CSV
                  </button>
                  <button type="button" className="btn-formato btn-pdf" onClick={handleExportarAlertasPdf}>
                    Descargar PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              SECCIÓN: PERFIL DEL OPERADOR
              configurado v1: junto al dashboard.jsx y miembros.js
              configurado v2: junto a auth_controller.py y auth_router.py para el bot de telegram
              ========================================= */}

          {seccionActiva === 'perfil' && (
            <div className="seccion-perfil-container">
              <div className="tarjeta-avatar-usuario">
                <div className="avatar-circulo">
                  {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="usuario-datos-texto">
                  <h4>{usuario?.nombre || 'Operador'}</h4>
                  <span className="badge-rol-admin">{rolOperadorActual}</span>
                  <span className="usuario-email">{usuario?.email || 'correo@ejemplo.com'}</span>
                </div>
              </div>

              <div className="card-detalle-perfil">
                <div className="fila-perfil">
                  <span className="label-perfil">ID de Operador (UUID):</span>
                  <span className="val-perfil font-mono">{usuario?.id || 'N/A'}</span>
                </div>
                <div className="fila-perfil">
                  <span className="label-perfil">Fecha de Registro:</span>
                  <span className="val-perfil font-mono">
                    {usuario?.creado_en ? new Date(usuario.creado_en).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="fila-perfil">
                  <span className="label-perfil">Estado de Telegram:</span>
                  <span className={`val-perfil ${usuario?.telegram_chat_id ? 'verde-online' : 'advertencia'}`}>
                    {usuario?.telegram_chat_id ? `Vinculado (ID: ${usuario.telegram_chat_id})` : 'No vinculado'}
                  </span>
                </div>

                {/* Sección interactiva para vincular Telegram */}
                {!usuario?.telegram_chat_id && (
                  <div className="vinculacion-telegram-box" style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#cbd5e1' }}>
                      Conectá tu cuenta para recibir alertas críticas automáticas directo en tu teléfono.
                    </p>
                    
                    {!codigoTelegram ? (
                      <button 
                        type="button" 
                        onClick={handleSolicitarCodigoTelegram}
                        disabled={cargandoCodigo}
                        className="btn-formato btn-pdf"
                      >
                        {cargandoCodigo ? 'Generando...' : '🔗 Vincular con Telegram'}
                      </button>
                    ) : (
                      <div className="instrucciones-vinculacion">
                        <p style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
                          1. Abrí tu bot en Telegram: <a href="https://t.me/SysMonitorAlertBot" target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>@SysMonitorAlertBot</a>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                          2. Enviále este comando exacto:
                        </p>
                        <div className="font-mono" style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem', userSelect: 'all', color: '#4ade80' }}>
                          /vincular {codigoTelegram}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer del Drawer: Botón Destacado de Cerrar Sesión */}
        <div className="ajustes-drawer-footer">
          <button
            type="button"
            className="btn-cerrar-sesion"
            onClick={() => {
              if (window.confirm('¿Desea cerrar la sesión del operador actual de forma segura?')) {
                onCerrar();
                mostrarMensajeDescarga('Sesión cerrada con éxito.');
              }
            }}
          >
            <span className="icono-logout">🚪</span>
            <span>Cerrar Sesión Segura</span>
          </button>
        </div>
      </div>
    </div>
  );
};

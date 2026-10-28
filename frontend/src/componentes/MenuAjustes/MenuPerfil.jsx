import React, { useState } from 'react';

export const MenuPerfil = ({
  usuario,
  rolOperadorActual,
  codigoTelegram,
  cargandoCodigo,
  handleSolicitarCodigoTelegram,
  onActualizarUsuario
}) => {
  const [verificando, setVerificando] = useState(false);

  const handleVerificarVinculacion = async () => {
    setVerificando(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const usuarioActualizado = await res.json();
        if (onActualizarUsuario) {
          onActualizarUsuario(usuarioActualizado);
        }
      }
    } catch (err) {
      console.error("Error al comprobar vinculación:", err);
    } finally {
      setVerificando(false);
    }
  };

  return (
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
            {usuario?.telegram_chat_id ? `✅ Vinculado (ID: ${usuario.telegram_chat_id})` : '⚠️ No vinculado'}
          </span>
        </div>

        {usuario?.telegram_chat_id && (
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={handleVerificarVinculacion}
              disabled={verificando}
              className="btn-formato"
              style={{ background: '#334155', color: '#fff', fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
            >
              {verificando ? 'Comprobando...' : '🔄 Comprobar Estado'}
            </button>
          </div>
        )}

        {!usuario?.telegram_chat_id && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '6px' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#cbd5e1' }}>
              Conectá tu cuenta para recibir alertas automáticas en tu teléfono.
            </p>
            {!codigoTelegram ? (
              <button type="button" onClick={handleSolicitarCodigoTelegram} disabled={cargandoCodigo} className="btn-formato btn-pdf">
                {cargandoCodigo ? 'Generando...' : '🔗 Vincular con Telegram'}
              </button>
            ) : (
              <div className="instrucciones-vinculacion">
                {/* Enlace corregido con https:// y el nombre exacto de tu bot */}
                <p style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                  1. Abrí el bot: <a href="https://t.me/sysmonitor_prueba1_bot" target="_blank" rel="noreferrer" style={{ color: '#fff' }}> t.me/sysmonitor_prueba1_bot</a>
                </p>
                <p style={{ fontSize: '0.8rem', color: '#38bdf8' }}>2. Enviale este comando exacto:</p>
                <div className="font-mono" style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '4px', color: '#4ade80', margin: '0.5rem 0' }}>
                  /vincular {codigoTelegram}
                </div>
                <button
                  type="button"
                  onClick={handleVerificarVinculacion}
                  disabled={verificando}
                  className="btn-formato"
                  style={{ marginTop: '0.5rem', background: '#334155', color: '#fff', fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer', width: '100%' }}
                >
                  {verificando ? 'Comprobando...' : '🔄 Comprobar Estado de Vinculación'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
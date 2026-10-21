import React from 'react';
import './UsuarioVista.css';

export const UsuarioVista = ({ usuario }) => {
  return (
    <main className="main-content">
      <div className="usuario-card">
        <div className="usuario-header">
          <h3>Información del Usuario</h3>
          <p>Configuración de cuenta y preferencias del operador</p>
        </div>

        <div className="usuario-details">
          <div className="detail-item">
            <span className="detail-label">Nombre de usuario</span>
            <span className="detail-value">{usuario?.nombre || 'Operador de Sistema'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Correo electrónico</span>
            <span className="detail-value">{usuario?.email || 'admin@infraestructura.local'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Rol asignado</span>
            <span className="detail-value badge-rol">Administrador de Monitoreo</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Estado de la cuenta</span>
            <span className="detail-value status-active">● Activa</span>
          </div>
        </div>
      </div>
    </main>
  );
};
import React from 'react';
import './TarjetaMetrica.css';

export const TarjetaMetrica = ({ title, value, unit, subtitle }) => {
  return (
    <div className="metric-card">
      <span className="metric-title">{title}</span>
      <div className="metric-value-container">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <span className="metric-subtitle">{subtitle}</span>}
    </div>
  );
};

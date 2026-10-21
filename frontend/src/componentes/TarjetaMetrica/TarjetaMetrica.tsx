import React from 'react';
import './TarjetaMetrica.css';

interface TarjetaMetricaProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
}

export const TarjetaMetrica: React.FC<TarjetaMetricaProps> = ({ title, value, unit, subtitle }) => {
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

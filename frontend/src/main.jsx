import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Se aplica el tema guardado antes de renderizar, así también lo respetan el login y el registro
document.documentElement.setAttribute('data-theme', localStorage.getItem('sysmonitor_tema') || 'oscuro');

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

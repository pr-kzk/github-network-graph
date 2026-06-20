import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initTelemetry } from '@/shared/telemetry';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

void initTelemetry();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

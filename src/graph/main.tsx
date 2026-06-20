import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GraphPage } from './GraphPage';
import { initTelemetry } from '@/shared/telemetry';
import '@/styles/globals.css';

const params = new URLSearchParams(window.location.search);
const owner = params.get('owner') ?? '';
const repo = params.get('repo') ?? '';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

void initTelemetry();

createRoot(root).render(
  <StrictMode>
    <GraphPage initialOwner={owner} initialRepo={repo} />
  </StrictMode>,
);

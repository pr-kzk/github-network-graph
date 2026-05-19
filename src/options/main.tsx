import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Options } from './Options';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);

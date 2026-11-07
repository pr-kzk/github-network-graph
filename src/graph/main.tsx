import { GraphPage } from './GraphPage';
import { mountApp } from '@/shared/mountApp';
import '@/styles/globals.css';

const params = new URLSearchParams(window.location.search);

void mountApp(
  <GraphPage initialOwner={params.get('owner') ?? ''} initialRepo={params.get('repo') ?? ''} />,
);

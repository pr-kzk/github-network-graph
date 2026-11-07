import { GraphPage } from './GraphPage';
import { parseGraphUrlState } from './lib/graphUrlState';
import { mountApp } from '@/shared/mountApp';
import '@/styles/globals.css';

const params = new URLSearchParams(window.location.search);

void mountApp(
  <GraphPage
    initialOwner={params.get('owner') ?? ''}
    initialRepo={params.get('repo') ?? ''}
    initialUrlState={parseGraphUrlState(window.location.search)}
  />,
);

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphStatusBar } from './GraphStatusBar';

const base = {
  loadedCount: 120,
  hasMore: true,
  refreshing: false,
  pendingNotice: false,
  retry: null,
};

const RETRY_AT = Date.parse('2026-01-01T00:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('GraphStatusBar', () => {
  it('summarises the loaded commits and says older history is available', () => {
    render(<GraphStatusBar {...base} />);
    expect(screen.getByText(/120 commits loaded · older history available/)).toBeInTheDocument();
  });

  it('says the full history is loaded once nothing older remains', () => {
    render(<GraphStatusBar {...base} hasMore={false} />);
    expect(screen.getByText(/full history loaded/)).toBeInTheDocument();
  });

  it('uses the singular for one commit', () => {
    render(<GraphStatusBar {...base} loadedCount={1} hasMore={false} />);
    expect(screen.getByText(/^1 commit loaded/)).toBeInTheDocument();
  });

  it('shows a refreshing indicator while the previous data stays visible', () => {
    render(<GraphStatusBar {...base} refreshing />);
    expect(screen.getByText('Refreshing…')).toBeInTheDocument();
  });

  it('reassures the user when GitHub is slow to prepare a refresh', () => {
    render(<GraphStatusBar {...base} refreshing pendingNotice />);
    expect(screen.getByText(/GitHub is still preparing this graph/)).toBeInTheDocument();
  });

  it('shows the retry countdown while loading more history keeps failing', () => {
    vi.useFakeTimers({ now: RETRY_AT, toFake: ['Date'] });
    render(
      <GraphStatusBar
        {...base}
        retry={{ kind: 'rateLimit', attempt: 2, maxAttempts: 3, resumeAt: RETRY_AT + 6000 }}
      />,
    );
    expect(
      screen.getByText('GitHub is limiting requests. Retrying in 6 s (attempt 2 of 3)…'),
    ).toBeInTheDocument();
  });
});

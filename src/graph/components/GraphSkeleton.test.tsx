import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphSkeleton } from './GraphSkeleton';

const RETRY_AT = Date.parse('2026-01-01T00:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('GraphSkeleton', () => {
  it('shows the retry countdown instead of the plain loading text while GitHub is retried', () => {
    vi.useFakeTimers({ now: RETRY_AT, toFake: ['Date'] });
    render(
      <GraphSkeleton
        pendingNotice={false}
        retry={{ kind: 'network', attempt: 1, maxAttempts: 3, resumeAt: RETRY_AT + 4000 }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connection problem. Retrying in 4 s (attempt 1 of 3)…',
    );
  });
});

import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CommitDetailError } from '../../lib/commitDetailTypes';
import { ChangesSection } from './ChangesSection';

const commitUrl = 'https://github.com/o/r/commit/abc';

function renderChanges(state: ComponentProps<typeof ChangesSection>['state']) {
  const onRetry = vi.fn<() => void>();
  const view = render(<ChangesSection state={state} commitUrl={commitUrl} onRetry={onRetry} />);
  return { ...view, onRetry };
}

function renderError(kind: CommitDetailError['kind']) {
  return renderChanges({ status: 'error', error: { kind } }).onRetry;
}

describe('ChangesSection', () => {
  it('renders nothing while no commit is selected', () => {
    const { container } = renderChanges({ status: 'idle' });
    expect(container).toBeEmptyDOMElement();
  });

  it('explains a rate limit and links to the commit', () => {
    renderError('rateLimit');
    expect(screen.getByRole('alert')).toHaveTextContent(/resets within the hour/);
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href', commitUrl);
  });

  it('states when a known rate limit resets', () => {
    const resetAt = new Date(2030, 0, 1, 15, 45).getTime();
    renderChanges({ status: 'error', error: { kind: 'rateLimit', resetAt } });
    expect(screen.getByRole('alert')).toHaveTextContent(/60 per hour.*resets at .*45/);
  });

  it('tells the user to sign in when access is denied', () => {
    renderError('auth');
    expect(screen.getByRole('alert')).toHaveTextContent(/Sign in to GitHub/);
    expect(screen.getByRole('link', { name: 'Sign in to GitHub' })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/login'),
    );
  });

  it('mentions private repositories when the commit is not found', () => {
    renderError('notFound');
    expect(screen.getByRole('alert')).toHaveTextContent(/private/);
  });

  it.each(['network', 'http'] as const)('lets the user retry after a %s failure', async (kind) => {
    const onRetry = renderError(kind);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

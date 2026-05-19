import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the auth heading and a sign-in link', () => {
    render(
      <ErrorState kind="auth" message="Need login" owner="o" repo="r" onRetry={vi.fn()} />,
    );
    expect(screen.getByText('Sign in to GitHub', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in to GitHub/ })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/login'),
    );
  });

  it('renders the shape heading with the upstream message', () => {
    render(
      <ErrorState kind="shape" message="unexpected schema" owner="o" repo="r" onRetry={vi.fn()} />,
    );
    expect(screen.getByText(/GitHub may have changed/)).toBeInTheDocument();
    expect(screen.getByText('unexpected schema')).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    const user = (await import('@testing-library/user-event')).default;
    render(<ErrorState kind="network" message="fail" owner="o" repo="r" onRetry={onRetry} />);
    await user.setup().click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

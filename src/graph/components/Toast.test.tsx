import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('exposes an empty polite status region while nothing is shown', () => {
    render(<Toast toast={null} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('announces the message inside the status region', () => {
    render(<Toast toast={{ id: 1, kind: 'success', message: 'Copied' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('keeps the same region when the message appears later', () => {
    const { rerender } = render(<Toast toast={null} />);
    const region = screen.getByRole('status');
    rerender(<Toast toast={{ id: 1, kind: 'error', message: 'Copy failed' }} />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Copy failed');
  });
});

import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FileStatusBadge } from './FileStatusBadge';

describe('FileStatusBadge', () => {
  it('labels a known status and falls back to the changed badge for an unknown one', () => {
    render(<FileStatusBadge status="added" />);
    expect(screen.getByLabelText('added')).toHaveTextContent('A');
    cleanup();
    render(<FileStatusBadge status="anything-else" />);
    const badge = screen.getByLabelText('changed');
    expect(badge).toHaveTextContent('·');
  });
});

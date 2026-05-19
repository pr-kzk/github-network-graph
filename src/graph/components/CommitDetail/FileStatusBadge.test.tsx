import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileStatusBadge } from './FileStatusBadge';

describe('FileStatusBadge', () => {
  it.each([
    ['added', 'A'],
    ['modified', 'M'],
    ['removed', 'D'],
    ['renamed', 'R'],
    ['copied', 'C'],
    ['changed', '·'],
    ['unchanged', '='],
  ])('renders %s as "%s"', (status, label) => {
    render(<FileStatusBadge status={status} />);
    const badge = screen.getByLabelText(status);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(label);
  });

  it('falls back to the changed badge for unknown status', () => {
    render(<FileStatusBadge status="anything-else" />);
    const badge = screen.getByLabelText('anything-else');
    expect(badge).toHaveTextContent('·');
  });
});

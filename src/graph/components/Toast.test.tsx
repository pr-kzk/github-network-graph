import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('announces the message inside the status region', () => {
    render(<Toast toast={{ id: 1, kind: 'success', message: 'Copied' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });
});

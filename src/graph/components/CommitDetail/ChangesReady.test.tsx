import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChangesReady } from './ChangesReady';

const FILES = [
  { filename: 'src/a.ts', status: 'modified', additions: 3, deletions: 1, changes: 4 },
  {
    filename: 'src/new-name.ts',
    previousFilename: 'src/old-name.ts',
    status: 'renamed',
    additions: 0,
    deletions: 0,
    changes: 0,
  },
];

function renderReady(overrides: { truncated?: boolean; files?: typeof FILES } = {}) {
  const files = overrides.files ?? FILES;
  render(
    <ChangesReady
      data={{
        additions: 3,
        deletions: 1,
        total: 4,
        files,
        truncated: overrides.truncated ?? false,
      }}
    />,
  );
}

describe('ChangesReady', () => {
  it('lists each changed file with its status and line counts', () => {
    renderReady();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('src/a.ts');
    expect(within(items[0]).getByLabelText('modified')).toBeInTheDocument();
    expect(items[0]).toHaveTextContent('+3');
    expect(items[0]).toHaveTextContent('−1');
    expect(items[1]).toHaveAttribute('title', 'src/old-name.ts → src/new-name.ts');
    expect(screen.queryByText(/only part of the file list/)).not.toBeInTheDocument();
  });

  it('says so when GitHub returned only part of the file list', () => {
    renderReady({ truncated: true });

    expect(screen.getByText(/only part of the file list is shown/)).toBeInTheDocument();
  });

  it('says so when the commit changed no files', () => {
    renderReady({ files: [] });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(/No files/i)).toBeInTheDocument();
  });
});

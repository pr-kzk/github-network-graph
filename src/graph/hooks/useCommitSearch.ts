import { useCallback, useMemo, useState } from 'react';
import { trackEvent } from '@/shared/telemetry';
import { searchCommits, stepMatchRow } from '../lib/commitSearch';
import type { ViewCommit } from '../lib/transform.types';

type UseCommitSearchArgs = {
  scope: string;
  commits: readonly ViewCommit[];
  commitBySha: ReadonlyMap<string, ViewCommit>;
  selectedSha: string | null;
  onSelect: (sha: string) => void;
};

export function useCommitSearch({
  scope,
  commits,
  commitBySha,
  selectedSha,
  onSelect,
}: UseCommitSearchArgs) {
  const [entry, setEntry] = useState({ scope, query: '' });
  const query = entry.scope === scope ? entry.query : '';
  const setQuery = useCallback((next: string) => setEntry({ scope, query: next }), [scope]);
  const result = useMemo(() => searchCommits(commits, query), [commits, query]);

  const step = useCallback(
    (direction: 1 | -1) => {
      trackEvent('search_used');
      const fromRow = selectedSha ? (commitBySha.get(selectedSha)?.row ?? null) : null;
      const row = stepMatchRow(result.rows, fromRow, direction);
      const target = row === null ? undefined : commits[row];
      if (target) onSelect(target.sha);
    },
    [commits, commitBySha, onSelect, result, selectedSha],
  );

  return { query, setQuery, result, step };
}

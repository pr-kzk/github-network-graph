import { useCallback, useMemo } from 'react';
import { t } from '@/shared/i18n';
import { findContainingRefs } from '../lib/containingRefs';
import type { ViewCommit } from '../lib/transform.types';
import { useChildrenIndex } from './useChildrenIndex';
import type { GraphDataState } from './graphDataReducer';
import { useResolveSelectedCommit } from './useResolveSelectedCommit';

const EMPTY_SHAS: string[] = [];

type UseGraphSelectionArgs = {
  state: GraphDataState;
  viewCommits: readonly ViewCommit[];
  selectedSha: string | null;
  setSelectedSha: (sha: string | null) => void;
  seekTo: (sha: string) => void;
  cancelSeek: () => void;
  showToast: (kind: 'success' | 'error', message: string) => void;
};

export function useGraphSelection({
  state,
  viewCommits,
  selectedSha,
  setSelectedSha,
  seekTo,
  cancelSeek,
  showToast,
}: UseGraphSelectionArgs) {
  const commitBySha = useMemo(() => {
    const map = new Map<string, ViewCommit>();
    for (const c of viewCommits) map.set(c.sha, c);
    return map;
  }, [viewCommits]);

  const childrenBySha = useChildrenIndex(viewCommits);

  const selectedCommit = selectedSha ? (commitBySha.get(selectedSha) ?? null) : null;

  const selectedChildren = useMemo(
    () => (selectedCommit ? (childrenBySha.get(selectedCommit.sha) ?? EMPTY_SHAS) : EMPTY_SHAS),
    [selectedCommit, childrenBySha],
  );

  const containingRefs = useMemo(
    () =>
      selectedCommit ? findContainingRefs(selectedCommit.sha, commitBySha, childrenBySha) : [],
    [selectedCommit, commitBySha, childrenBySha],
  );

  const handleNotFound = useCallback(() => {
    setSelectedSha(null);
    showToast('error', t('toast_commit_not_found'));
  }, [setSelectedSha, showToast]);
  const handleHiddenByMode = useCallback(() => {
    setSelectedSha(null);
    showToast('error', t('toast_commit_hidden_by_mode'));
  }, [setSelectedSha, showToast]);
  useResolveSelectedCommit({
    state,
    isLoaded: selectedCommit !== null,
    selectedSha,
    seekTo,
    cancelSeek,
    onNotFound: handleNotFound,
    onHiddenByMode: handleHiddenByMode,
  });

  return { commitBySha, childrenBySha, selectedCommit, selectedChildren, containingRefs };
}

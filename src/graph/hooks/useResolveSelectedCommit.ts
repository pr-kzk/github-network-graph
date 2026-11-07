import { useEffect } from 'react';
import type { GraphDataState } from './useGraphData';

type UseResolveSelectedCommitArgs = {
  state: GraphDataState;
  isLoaded: boolean;
  selectedSha: string | null;
  seekTo: (sha: string) => void;
  cancelSeek: () => void;
  onNotFound: () => void;
  onHiddenByMode: () => void;
};

export function useResolveSelectedCommit({
  state,
  isLoaded,
  selectedSha,
  seekTo,
  cancelSeek,
  onNotFound,
  onHiddenByMode,
}: UseResolveSelectedCommitArgs) {
  const ready = state.status === 'ready';
  const unresolved = ready && selectedSha !== null && !isLoaded;
  const hiddenByMode = unresolved && state.rawCommits.some((c) => c.id === selectedSha);
  const awaiting = unresolved && !hiddenByMode;
  const idle = ready && !state.loadingMore && state.olderError === null;
  const canLoadOlder = idle && state.hasMore;
  const exhausted = idle && !state.hasMore;

  useEffect(() => {
    if (awaiting && canLoadOlder && selectedSha !== null) seekTo(selectedSha);
  }, [awaiting, canLoadOlder, selectedSha, seekTo]);

  useEffect(() => {
    if (selectedSha === null) return undefined;
    return cancelSeek;
  }, [selectedSha, cancelSeek]);

  useEffect(() => {
    if (awaiting && exhausted) onNotFound();
  }, [awaiting, exhausted, onNotFound]);

  useEffect(() => {
    if (hiddenByMode) onHiddenByMode();
  }, [hiddenByMode, onHiddenByMode]);
}

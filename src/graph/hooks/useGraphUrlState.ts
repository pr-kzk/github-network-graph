import { useCallback, useEffect, useState } from 'react';
import { type GraphMode, localStore } from '@/shared/storage';
import { trackEvent } from '@/shared/telemetry';
import { useLocalValue } from '@/shared/useLocalValue';
import { buildGraphUrl, type GraphUrlState } from '../lib/graphUrlState';

type UseGraphUrlStateArgs = {
  owner: string;
  repo: string;
  initial: GraphUrlState;
};

export function useGraphUrlState({ owner, repo, initial }: UseGraphUrlStateArgs) {
  const prefs = useLocalValue('graphPrefs');
  const [selectedSha, setSelectedSha] = useState<string | null>(initial.sha);
  // Writing the URL mode back to saved settings is avoided: merely opening a shared link would overwrite the default.
  const [tabMode, setTabMode] = useState<GraphMode | null>(initial.mode);
  const mode = tabMode ?? prefs.mode;

  useEffect(() => {
    const next = buildGraphUrl(window.location.href, { owner, repo, sha: selectedSha, mode });
    if (next !== window.location.href) window.history.replaceState(null, '', next);
  }, [owner, repo, selectedSha, mode]);

  const changeMode = useCallback(
    async (next: GraphMode) => {
      if (next === mode) return;
      trackEvent('mode_change', { mode: next });
      const saved = localStore.update('graphPrefs', { mode: next });
      setTabMode(null);
      await saved;
    },
    [mode],
  );

  const linkTo = useCallback(
    (sha: string) => buildGraphUrl(window.location.href, { owner, repo, sha, mode }),
    [owner, repo, mode],
  );

  return { selectedSha, setSelectedSha, mode, changeMode, linkTo };
}

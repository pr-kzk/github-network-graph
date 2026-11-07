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
  // URL のモードを保存済み設定へ反映する方式は、共有リンクを開くだけで既定が書き換わるため採らない。
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
      const saved = localStore.set('graphPrefs', { ...prefs, mode: next });
      setTabMode(null);
      await saved;
    },
    [mode, prefs],
  );

  const linkTo = useCallback(
    (sha: string) => buildGraphUrl(window.location.href, { owner, repo, sha, mode }),
    [owner, repo, mode],
  );

  return { selectedSha, setSelectedSha, mode, changeMode, linkTo };
}

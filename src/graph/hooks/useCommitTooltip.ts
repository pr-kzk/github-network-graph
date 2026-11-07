import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewCommit } from '../lib/transform.types';

const SHOW_DELAY_MS = 350;
const FOCUS_HIDE_MS = 3000;

type TooltipAnchor = { sha: string; x: number; y: number };

type UseCommitTooltipResult = {
  anchor: TooltipAnchor | null;
  commit: ViewCommit | null;
  onHover: (sha: string, x: number, y: number) => void;
  onFocus: (sha: string, x: number, y: number) => void;
  onLeave: () => void;
};

export function useCommitTooltip(
  commitBySha: ReadonlyMap<string, ViewCommit>,
  suppressed: boolean,
): UseCommitTooltipResult {
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visible = useRef(false);

  const onLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    visible.current = false;
    setAnchor(null);
  }, []);

  const show = useCallback((next: TooltipAnchor, autoHide: boolean) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    const reveal = () => {
      visible.current = true;
      setAnchor(next);
      if (autoHide) {
        hideTimer.current = setTimeout(() => {
          visible.current = false;
          setAnchor(null);
        }, FOCUS_HIDE_MS);
      }
    };
    if (visible.current) reveal();
    else showTimer.current = setTimeout(reveal, SHOW_DELAY_MS);
  }, []);

  const onHover = useCallback(
    (sha: string, x: number, y: number) => show({ sha, x, y }, false),
    [show],
  );
  const onFocus = useCallback(
    (sha: string, x: number, y: number) => show({ sha, x, y }, true),
    [show],
  );

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    },
    [],
  );

  const commit = useMemo(
    () => (anchor && !suppressed ? (commitBySha.get(anchor.sha) ?? null) : null),
    [anchor, commitBySha, suppressed],
  );

  return { anchor, commit, onHover, onFocus, onLeave };
}

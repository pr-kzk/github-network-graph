import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewCommit } from '../lib/transform.types';

const SHOW_DELAY_MS = 350;
const FOCUS_HIDE_MS = 3000;

type Point = { x: number; y: number };

export type TooltipPointer = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Point;
};

type UseCommitTooltipResult = {
  commit: ViewCommit | null;
  pointer: TooltipPointer;
  onHover: (sha: string, x: number, y: number) => void;
  onFocus: (sha: string, x: number, y: number) => void;
  onLeave: () => void;
};

export function useCommitTooltip(
  commitBySha: ReadonlyMap<string, ViewCommit>,
  suppressed: boolean,
): UseCommitTooltipResult {
  const [sha, setSha] = useState<string | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visible = useRef(false);
  const point = useRef<Point>({ x: 0, y: 0 });
  const listeners = useRef(new Set<() => void>());

  const pointer = useMemo<TooltipPointer>(
    () => ({
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => void listeners.current.delete(listener);
      },
      getSnapshot: () => point.current,
    }),
    [],
  );

  const onLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    visible.current = false;
    setSha(null);
  }, []);

  const show = useCallback((nextSha: string, x: number, y: number, autoHide: boolean) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    const reveal = () => {
      visible.current = true;
      point.current = { x, y };
      for (const listener of listeners.current) listener();
      setSha(nextSha);
      if (autoHide) {
        hideTimer.current = setTimeout(() => {
          visible.current = false;
          setSha(null);
        }, FOCUS_HIDE_MS);
      }
    };
    if (visible.current) reveal();
    else showTimer.current = setTimeout(reveal, SHOW_DELAY_MS);
  }, []);

  const onHover = useCallback(
    (nextSha: string, x: number, y: number) => show(nextSha, x, y, false),
    [show],
  );
  const onFocus = useCallback(
    (nextSha: string, x: number, y: number) => show(nextSha, x, y, true),
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
    () => (sha && !suppressed ? (commitBySha.get(sha) ?? null) : null),
    [sha, commitBySha, suppressed],
  );

  return { commit, pointer, onHover, onFocus, onLeave };
}

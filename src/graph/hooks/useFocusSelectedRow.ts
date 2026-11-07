import { useEffect, useRef, type RefObject } from 'react';

// Focusing right after selection is not done: a virtualized row may not be mounted yet.
export function useFocusSelectedRow(
  scrollRef: RefObject<HTMLElement | null>,
  selectedSha: string | null,
) {
  const previousSelectedSha = useRef(selectedSha);
  const pendingFocusSha = useRef<string | null>(null);

  useEffect(() => {
    if (previousSelectedSha.current === selectedSha) return;
    previousSelectedSha.current = selectedSha;
    const active = document.activeElement;
    const focusIsFree =
      active === document.body || (active !== null && scrollRef.current?.contains(active));
    pendingFocusSha.current = focusIsFree ? selectedSha : null;
  }, [selectedSha, scrollRef]);

  useEffect(() => {
    const sha = pendingFocusSha.current;
    if (!sha) return;
    const row = scrollRef.current?.querySelector<HTMLElement>(`[data-sha="${sha}"]`);
    if (!row) return;
    pendingFocusSha.current = null;
    row.focus({ preventScroll: true });
  });
}

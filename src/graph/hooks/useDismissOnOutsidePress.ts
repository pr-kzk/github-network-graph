import { useEffect, type RefObject } from 'react';
import { useLatest } from '@/shared/useLatest';

export function useDismissOnOutsidePress(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  active = true,
): void {
  const dismiss = useLatest(onDismiss);
  useEffect(() => {
    if (!active) return undefined;
    function handlePress(e: Event) {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      dismiss.current();
    }
    document.addEventListener('mousedown', handlePress, true);
    document.addEventListener('contextmenu', handlePress, true);
    return () => {
      document.removeEventListener('mousedown', handlePress, true);
      document.removeEventListener('contextmenu', handlePress, true);
    };
  }, [ref, dismiss, active]);
}

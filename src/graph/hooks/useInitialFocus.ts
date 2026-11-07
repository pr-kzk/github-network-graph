import { useEffect } from 'react';
import { useLatest } from '@/shared/useLatest';

export function useInitialFocus(getTarget: () => HTMLElement | null | undefined): void {
  const target = useLatest(getTarget);
  useEffect(() => {
    const opener = document.activeElement;
    target.current()?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [target]);
}

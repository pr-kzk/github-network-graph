import { useCallback, useRef, useState } from 'react';
import { useRestartableTimeout } from '@/shared/useRestartableTimeout';

type ToastKind = 'success' | 'error';
export type Toast = { id: number; kind: ToastKind; message: string };

const DISMISS_MS: Record<ToastKind, number> = { success: 2000, error: 6000 };

export type UseToastResult = {
  toast: Toast | null;
  showToast: (kind: ToastKind, message: string) => void;
};

// Stacking several toasts is avoided: repeated copies would fill the screen and get in the way.
export function useToast(): UseToastResult {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const restartTimeout = useRestartableTimeout();

  const showToast = useCallback(
    (kind: ToastKind, message: string) => {
      nextId.current += 1;
      setToast({ id: nextId.current, kind, message });
      restartTimeout(() => setToast(null), DISMISS_MS[kind]);
    },
    [restartTimeout],
  );

  return { toast, showToast };
}

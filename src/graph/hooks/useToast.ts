import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastKind = 'success' | 'error';
export type Toast = { id: number; kind: ToastKind; message: string };

const DISMISS_MS: Record<ToastKind, number> = { success: 2000, error: 6000 };

export type UseToastResult = {
  toast: Toast | null;
  showToast: (kind: ToastKind, message: string) => void;
};

// 通知を複数積む方式は、連続コピーで画面が埋まり操作を邪魔するため採らない。
export function useToast(): UseToastResult {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, kind, message });
    timer.current = setTimeout(() => setToast(null), DISMISS_MS[kind]);
  }, []);

  return { toast, showToast };
}

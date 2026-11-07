import type { Toast as ToastModel } from '../hooks/useToast';

type ToastProps = {
  toast: ToastModel | null;
};

// live region を表示のたびに生成する方式は、支援技術が読み上げを取りこぼすため採らない。
export function Toast({ toast }: ToastProps) {
  return (
    <output
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      {toast ? (
        <div
          key={toast.id}
          className={[
            'rounded-md px-4 py-2 text-xs font-medium shadow-lg ring-1 ring-black/10',
            toast.kind === 'error'
              ? 'bg-rose-700 text-white'
              : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
          ].join(' ')}
        >
          {toast.message}
        </div>
      ) : null}
    </output>
  );
}

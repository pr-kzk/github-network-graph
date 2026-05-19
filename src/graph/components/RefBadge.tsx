import type { ViewRef } from '../lib/transform.types';

export function RefBadge({ refItem }: { refItem: ViewRef }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        refItem.isFocus
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40',
      ].join(' ')}
      title={refItem.isFocus ? refItem.name : `${refItem.ownerName}:${refItem.name}`}
    >
      {refItem.isFocus ? refItem.name : `${refItem.ownerName}:${refItem.name}`}
    </span>
  );
}

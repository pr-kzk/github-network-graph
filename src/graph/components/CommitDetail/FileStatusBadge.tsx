export type FileStatusBadgeProps = { status: string };

export function FileStatusBadge({ status }: FileStatusBadgeProps) {
  const map: Record<string, { label: string; cls: string }> = {
    added: { label: 'A', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
    modified: { label: 'M', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
    removed: { label: 'D', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
    renamed: { label: 'R', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
    copied: { label: 'C', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
    changed: { label: '·', cls: 'bg-slate-700/40 text-slate-300 ring-slate-600/40' },
    unchanged: { label: '=', cls: 'bg-slate-700/40 text-slate-400 ring-slate-600/40' },
  };
  const entry = map[status] ?? map.changed;
  return (
    <span
      className={`inline-flex w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] ring-1 ${entry.cls}`}
      aria-label={status}
    >
      {entry.label}
    </span>
  );
}

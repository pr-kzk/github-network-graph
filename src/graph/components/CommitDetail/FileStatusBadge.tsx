import { t, type MessageKey } from '@/shared/i18n';

type Badge = { glyph: string; labelKey: MessageKey; cls: string };

const BADGES: Record<string, Badge> = {
  added: {
    glyph: 'A',
    labelKey: 'file_status_added',
    cls: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
  },
  modified: {
    glyph: 'M',
    labelKey: 'file_status_modified',
    cls: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  },
  removed: {
    glyph: 'D',
    labelKey: 'file_status_removed',
    cls: 'bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300',
  },
  renamed: {
    glyph: 'R',
    labelKey: 'file_status_renamed',
    cls: 'bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  },
  copied: {
    glyph: 'C',
    labelKey: 'file_status_copied',
    cls: 'bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  },
  changed: {
    glyph: '·',
    labelKey: 'file_status_changed',
    cls: 'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/40',
  },
  unchanged: {
    glyph: '=',
    labelKey: 'file_status_unchanged',
    cls: 'bg-slate-200 text-slate-600 ring-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:ring-slate-600/40',
  },
};

type FileStatusBadgeProps = { status: string };

export function FileStatusBadge({ status }: FileStatusBadgeProps) {
  const badge = BADGES[status] ?? BADGES.changed;
  return (
    <span
      className={`inline-flex w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] ring-1 ${badge.cls}`}
      aria-label={t(badge.labelKey)}
    >
      {badge.glyph}
    </span>
  );
}

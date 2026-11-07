import { useState } from 'react';
import { t, tWith } from '@/shared/i18n';
import type { ContainingRef } from '../../lib/containingRefs';

const COLLAPSED_REF_LIMIT = 40;

type ContainingRefsSectionProps = {
  refs: ContainingRef[];
  onClick: (sha: string) => void;
};

export function ContainingRefsSection({ refs, onClick }: ContainingRefsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? refs : refs.slice(0, COLLAPSED_REF_LIMIT);
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('commit_detail_branches_heading')}
      </h3>
      {refs.length === 0 ? (
        <p className="text-xs text-slate-500">{t('commit_detail_branches_empty')}</p>
      ) : (
        <ul className="flex max-h-24 flex-wrap gap-1 overflow-auto">
          {shown.map((ref) => {
            const label = ref.isFocus ? ref.name : `${ref.ownerName}:${ref.name}`;
            return (
              <li key={`${ref.ownerName}:${ref.name}`}>
                <button
                  type="button"
                  title={label}
                  onClick={() => onClick(ref.sha)}
                  className={[
                    'max-w-48 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 focus-visible:outline-2 focus-visible:outline-sky-500',
                    ref.isFocus
                      ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 ring-slate-300 hover:bg-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/40 dark:hover:bg-slate-700/70',
                  ].join(' ')}
                >
                  {label}
                </button>
              </li>
            );
          })}
          {shown.length < refs.length ? (
            <li>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-indigo-300"
              >
                {tWith('commit_detail_branches_show_all', { count: String(refs.length) })}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

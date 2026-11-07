import type { CommitDetailExtraState } from '../../hooks/useCommitDetailExtra';
import { t } from '@/shared/i18n';
import { ChangesError } from './ChangesError';
import { ChangesReady } from './ChangesReady';

type ChangesSectionProps = {
  state: CommitDetailExtraState;
  commitUrl: string;
  onRetry: () => void;
};

export function ChangesSection({ state, commitUrl, onRetry }: ChangesSectionProps) {
  if (state.status === 'idle') return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('commit_detail_changes_heading')}
      </h3>
      {state.status === 'loading' ? (
        <p className="text-xs text-slate-500">{t('commit_detail_changes_loading')}</p>
      ) : state.status === 'error' ? (
        <ChangesError error={state.error} commitUrl={commitUrl} onRetry={onRetry} />
      ) : (
        <ChangesReady data={state.data} />
      )}
    </section>
  );
}

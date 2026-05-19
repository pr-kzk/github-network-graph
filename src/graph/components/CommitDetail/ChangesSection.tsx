import type { CommitDetailExtraState } from '../../hooks/useCommitDetailExtra';
import { t } from '@/shared/i18n';
import { ChangesReady } from './ChangesReady';

export type ChangesSectionProps = {
  state: CommitDetailExtraState;
};

export function ChangesSection({ state }: ChangesSectionProps) {
  // エラー時はセクションごと非表示にする (notFound や rateLimit を表に出してもユーザー
  // が即座にできることはないため、UI ノイズを避ける)。
  if (state.status === 'idle' || state.status === 'error') return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('commit_detail_changes_heading')}
      </h3>
      {state.status === 'loading' ? (
        <p className="text-xs text-slate-500">{t('commit_detail_changes_loading')}</p>
      ) : (
        <ChangesReady data={state.data} />
      )}
    </section>
  );
}

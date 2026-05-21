import { useCommitDetailExtra } from '../../hooks/useCommitDetailExtra';
import type { ViewCommit } from '../../lib/transform.types';
import { formatFullDate } from '@/shared/format';
import { t } from '@/shared/i18n';
import { AuthorAvatar } from '../AuthorAvatar';
import { ChangesSection } from './ChangesSection';
import { CommitDetailHeader } from './CommitDetailHeader';
import { RelationSection } from './RelationSection';

export type CommitDetailProps = {
  commit: ViewCommit | null;
  // 入力されている本家リポジトリ。アクション (GitHub で開く) と extra fetch の対象。
  owner: string;
  repo: string;
  // この commit を親として参照している子コミット SHA。GraphPage で派生して渡す。
  childrenShas: string[];
  onParentClick: (sha: string) => void;
  onChildClick: (sha: string) => void;
};

export function CommitDetail({
  commit,
  owner,
  repo,
  childrenShas,
  onParentClick,
  onChildClick,
}: CommitDetailProps) {
  const extra = useCommitDetailExtra({
    owner,
    repo,
    authorOwner: commit?.authorLogin || undefined,
    authorRepo: commit?.authorRepo || undefined,
    sha: commit?.sha ?? null,
  });

  if (!commit) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
        {t('commit_detail_select_prompt')}
      </div>
    );
  }
  const dateLabel = commit.dateLabel || `#${commit.time}`;
  const absoluteDate = formatFullDate(commit.dateLabel);
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-5 text-sm">
      <CommitDetailHeader commit={commit} commitUrl={commitUrl} />
      <div className="font-mono text-[11px] text-slate-500 break-all">{commit.sha}</div>
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <AuthorAvatar login={commit.authorLogin} alt={commit.authorName} size={18} />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-slate-700 dark:text-slate-300">{commit.authorName || t('commit_unknown_author')}</span>
          {commit.authorRepo && commit.authorName !== commit.authorRepo ? (
            <span className="text-slate-500"> / {commit.authorRepo}</span>
          ) : null}
          <span className="px-2 text-slate-400 dark:text-slate-600">·</span>
          <span className="font-mono text-slate-500" title={absoluteDate || undefined}>
            {dateLabel}
          </span>
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-100 p-3 font-sans text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-100 dark:ring-slate-800">
        {commit.message || t('commit_detail_no_message')}
      </pre>
      <RelationSection
        title={t('commit_detail_parents_heading')}
        shas={commit.parents}
        emptyLabel={t('commit_detail_parents_empty')}
        onClick={onParentClick}
      />
      <RelationSection
        title={t('commit_detail_children_heading')}
        shas={childrenShas}
        emptyLabel={t('commit_detail_children_empty')}
        onClick={onChildClick}
      />
      <ChangesSection state={extra} />
    </div>
  );
}

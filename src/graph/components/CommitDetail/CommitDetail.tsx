import { memo } from 'react';
import { useCommitDetailExtra } from '../../hooks/useCommitDetailExtra';
import type { ContainingRef } from '../../lib/containingRefs';
import type { ViewCommit } from '../../lib/transform.types';
import { formatFullDate } from '@/shared/format';
import { t } from '@/shared/i18n';
import { AuthorAvatar } from '../AuthorAvatar';
import { AuthorLabel } from '../AuthorLabel';
import { ChangesSection } from './ChangesSection';
import { ContainingRefsSection } from './ContainingRefsSection';
import { CommitDetailHeader } from './CommitDetailHeader';
import { RelationSection } from './RelationSection';

export type CommitDetailProps = {
  commit: ViewCommit | null;
  owner: string;
  repo: string;
  childrenShas: string[];
  containingRefs: ContainingRef[];
  onCopy: (text: string) => void;
  onCopyLink: (sha: string) => void;
  onSelectSha: (sha: string) => void;
};

function CommitDetailImpl({
  commit,
  owner,
  repo,
  childrenShas,
  containingRefs,
  onCopy,
  onCopyLink,
  onSelectSha,
}: CommitDetailProps) {
  const { state: extra, retry } = useCommitDetailExtra({
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
      <CommitDetailHeader
        commit={commit}
        commitUrl={commitUrl}
        onCopy={onCopy}
        onCopyLink={onCopyLink}
      />
      <div className="font-mono text-[11px] text-slate-500 break-all">{commit.sha}</div>
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <AuthorAvatar login={commit.authorLogin} alt={commit.authorName} size={18} />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-slate-700 dark:text-slate-300">
            <AuthorLabel commit={commit} />
          </span>
          <span className="px-2 text-slate-400 dark:text-slate-600">·</span>
          <span className="font-mono text-slate-500" title={absoluteDate || undefined}>
            {dateLabel}
          </span>
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-100 p-3 font-sans text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-100 dark:ring-slate-800">
        {commit.message || t('commit_detail_no_message')}
      </pre>
      <ContainingRefsSection key={commit.sha} refs={containingRefs} onClick={onSelectSha} />
      <RelationSection
        title={t('commit_detail_parents_heading')}
        shas={commit.parents}
        emptyLabel={t('commit_detail_parents_empty')}
        onClick={onSelectSha}
      />
      <RelationSection
        title={t('commit_detail_children_heading')}
        shas={childrenShas}
        emptyLabel={t('commit_detail_children_empty')}
        onClick={onSelectSha}
      />
      <ChangesSection state={extra} commitUrl={commitUrl} onRetry={retry} />
    </div>
  );
}

export const CommitDetail = memo(CommitDetailImpl);

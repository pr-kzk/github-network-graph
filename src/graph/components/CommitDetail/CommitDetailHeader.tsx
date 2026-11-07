import type { ViewCommit } from '../../lib/transform.types';
import { t } from '@/shared/i18n';
import { RefBadge } from '../RefBadge';
import { IconButton } from './IconButton';
import { CopyIcon, ExternalLinkIcon, TextCopyIcon } from './icons';

export type CommitDetailHeaderProps = {
  commit: ViewCommit;
  commitUrl: string;
  onCopy: (text: string) => void;
};

export function CommitDetailHeader({ commit, commitUrl, onCopy }: CommitDetailHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
        {commit.shortSha}
      </span>
      {commit.refs.map((r) => (
        <RefBadge key={`${r.ownerName}:${r.name}`} refItem={r} />
      ))}
      <div className="ml-auto flex items-center gap-1">
        <IconButton
          label={t('commit_detail_action_open_github')}
          onClick={() => window.open(commitUrl, '_blank', 'noopener')}
        >
          <ExternalLinkIcon />
        </IconButton>
        <IconButton label={t('commit_detail_action_copy_sha')} onClick={() => onCopy(commit.sha)}>
          <CopyIcon />
        </IconButton>
        <IconButton
          label={t('commit_detail_action_copy_subject')}
          onClick={() => onCopy(commit.subject)}
          disabled={!commit.subject}
        >
          <TextCopyIcon />
        </IconButton>
      </div>
    </header>
  );
}

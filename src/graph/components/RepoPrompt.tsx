import { t } from '@/shared/i18n';
import { RepoForm } from './RepoForm';

type RepoPromptProps = {
  onSubmit: (owner: string, repo: string) => void;
};

export function RepoPrompt({ onSubmit }: RepoPromptProps) {
  return (
    <div className="m-6 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        {t('graph_repo_prompt_prefix')}{' '}
        <span className="font-mono text-slate-800 dark:text-slate-200">owner/repo</span>{' '}
        {t('graph_repo_prompt_suffix')}
      </p>
      <RepoForm onSubmit={onSubmit} />
    </div>
  );
}

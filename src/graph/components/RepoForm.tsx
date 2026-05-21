import { useState } from 'react';
import { t } from '@/shared/i18n';
import { parseRepoFromInput } from '../lib/parseUrl';

export type RepoFormProps = {
  initialValue?: string;
  onSubmit: (owner: string, repo: string) => void;
};

export function RepoForm({ initialValue = '', onSubmit }: RepoFormProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseRepoFromInput(value);
        if (!parsed) {
          setError(t('graph_repoform_error'));
          return;
        }
        setError(null);
        onSubmit(parsed.owner, parsed.repo);
      }}
      className="flex flex-col gap-3"
    >
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="repo-input">
        {t('graph_repoform_label')}
      </label>
      <input
        id="repo-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('graph_repoform_placeholder')}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
      />
      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
      <button
        type="submit"
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        {t('graph_repoform_submit')}
      </button>
    </form>
  );
}

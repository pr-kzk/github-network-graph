import type { CommitDetailError } from '../../lib/commitDetailTypes';
import { formatClockTime } from '@/shared/format';
import { t, tWith, type MessageKey } from '@/shared/i18n';

type ChangesErrorProps = {
  error: CommitDetailError;
  commitUrl: string;
  onRetry: () => void;
};

const MESSAGE_KEYS: Record<CommitDetailError['kind'], MessageKey> = {
  rateLimit: 'commit_detail_changes_error_ratelimit',
  auth: 'commit_detail_changes_error_auth',
  notFound: 'commit_detail_changes_error_notfound',
  network: 'commit_detail_changes_error_network',
  http: 'commit_detail_changes_error_generic',
  shape: 'commit_detail_changes_error_generic',
};

const ACTION_CLASS =
  'rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

function messageFor(error: CommitDetailError): string {
  if (error.kind === 'rateLimit' && error.resetAt !== undefined) {
    return tWith('commit_detail_changes_error_ratelimit_reset', {
      time: formatClockTime(error.resetAt),
    });
  }
  return t(MESSAGE_KEYS[error.kind]);
}

export function ChangesError({ error, commitUrl, onRetry }: ChangesErrorProps) {
  return (
    <div className="space-y-2" role="alert">
      <p className="text-xs text-slate-700 dark:text-slate-300">{messageFor(error)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} className={ACTION_CLASS}>
          {t('error_retry')}
        </button>
        {error.kind === 'auth' || error.kind === 'notFound' ? (
          <a
            href="https://github.com/login"
            target="_blank"
            rel="noreferrer"
            className={ACTION_CLASS}
          >
            {t('error_signin_link')}
          </a>
        ) : null}
        <a href={commitUrl} target="_blank" rel="noreferrer" className={ACTION_CLASS}>
          {t('commit_detail_action_open_github')}
        </a>
      </div>
    </div>
  );
}

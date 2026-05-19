import { t, tWith, type MessageKey } from '@/shared/i18n';
import type { NetworkApiError } from '../lib/networkApi';

export type ErrorStateProps = {
  kind: NetworkApiError['kind'] | 'unknown';
  message: string;
  owner: string;
  repo: string;
  onRetry: () => void;
};

const HEADING_KEYS: Record<ErrorStateProps['kind'], MessageKey> = {
  auth: 'error_auth_heading',
  notFound: 'error_notfound_heading',
  network: 'error_network_heading',
  empty: 'error_empty_heading',
  shape: 'error_shape_heading',
  http: 'error_http_heading',
  unknown: 'error_unknown_heading',
};

export function ErrorState({ kind, message, owner, repo, onRetry }: ErrorStateProps) {
  return (
    <div className="m-6 max-w-xl rounded-lg border border-rose-900/40 bg-rose-950/30 p-6">
      <h2 className="text-base font-semibold text-rose-200">{t(HEADING_KEYS[kind])}</h2>
      <p className="mt-2 text-sm text-rose-100/80">{message}</p>
      {owner && repo ? (
        <p className="mt-3 text-xs text-rose-200/60">
          {tWith('error_target_label', { repo: `${owner}/${repo}` })}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
        >
          {t('error_retry')}
        </button>
        {kind === 'auth' ? (
          <a
            href="https://github.com/login"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            {t('error_signin_link')}
          </a>
        ) : null}
      </div>
    </div>
  );
}

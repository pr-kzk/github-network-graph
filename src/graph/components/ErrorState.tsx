import { t, tWith, type MessageKey } from '@/shared/i18n';
import { BUTTON_SECONDARY } from '@/shared/ui';
import type { GraphErrorKind } from '../lib/networkApi';

type ErrorStateProps = {
  kind: GraphErrorKind;
  message: string;
  owner: string;
  repo: string;
  onRetry: () => void;
};

const HEADING_KEYS: Record<GraphErrorKind, MessageKey> = {
  auth: 'error_auth_heading',
  notFound: 'error_notfound_heading',
  rateLimit: 'error_ratelimit_heading',
  server: 'error_server_heading',
  network: 'error_network_heading',
  empty: 'error_empty_heading',
  shape: 'error_shape_heading',
  http: 'error_http_heading',
  pending: 'error_pending_heading',
  unknown: 'error_unknown_heading',
};

const HINT_KEYS: Partial<Record<GraphErrorKind, MessageKey>> = {
  rateLimit: 'error_hint_ratelimit',
  network: 'error_hint_network',
  server: 'error_hint_server',
};

const LINK_CLASS = `${BUTTON_SECONDARY} px-3 py-1.5 text-xs font-medium`;

export function ErrorState({ kind, message, owner, repo, onRetry }: ErrorStateProps) {
  const hintKey = HINT_KEYS[kind];
  return (
    <div className="m-6 max-w-xl rounded-lg border border-rose-300 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-950/30">
      <h2 className="text-base font-semibold text-rose-800 dark:text-rose-200">
        {t(HEADING_KEYS[kind])}
      </h2>
      <p className="mt-2 text-sm text-rose-900/80 dark:text-rose-100/80">{message}</p>
      {hintKey ? (
        <p className="mt-2 text-sm text-rose-900/80 dark:text-rose-100/80">{t(hintKey)}</p>
      ) : null}
      {owner && repo ? (
        <p className="mt-3 text-xs text-rose-800/60 dark:text-rose-200/60">
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
        {kind === 'auth' || kind === 'notFound' ? (
          <a
            href="https://github.com/login"
            target="_blank"
            rel="noreferrer"
            className={LINK_CLASS}
          >
            {t('error_signin_link')}
          </a>
        ) : null}
        {kind === 'rateLimit' && owner && repo ? (
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            className={LINK_CLASS}
          >
            {t('graph_repo_open_github')}
          </a>
        ) : null}
      </div>
    </div>
  );
}

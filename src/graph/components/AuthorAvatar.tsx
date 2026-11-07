import { useState } from 'react';

type AuthorAvatarProps = {
  login: string;
  size?: number;
  alt?: string;
};

export function AuthorAvatar({ login, size = 16, alt = '' }: AuthorAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (login || '?').charAt(0).toUpperCase();
  const style = { width: size, height: size };

  if (!login || failed) {
    return (
      <span
        aria-hidden="true"
        style={{ ...style, fontSize: Math.max(8, Math.floor(size * 0.55)) }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-300 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300"
      >
        {initial}
      </span>
    );
  }

  // Not sized per call site via the query string: one URL per login keeps a single cache entry.
  return (
    <img
      src={`https://github.com/${login}.png?size=64`}
      alt={alt}
      style={style}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-300 object-cover dark:bg-slate-700"
    />
  );
}

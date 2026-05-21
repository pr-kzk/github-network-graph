import { useState } from 'react';

export type AuthorAvatarProps = {
  login: string;
  // 表示する CSS ピクセルサイズ。実画像は Retina 用に 2 倍解像度を取得する。
  size?: number;
  alt?: string;
  className?: string;
};

export function AuthorAvatar({
  login,
  size = 16,
  alt = '',
  className = '',
}: AuthorAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (login || '?').charAt(0).toUpperCase();
  const style = { width: size, height: size };

  if (!login || failed) {
    return (
      <span
        aria-hidden="true"
        style={{ ...style, fontSize: Math.max(8, Math.floor(size * 0.55)) }}
        className={[
          'inline-flex shrink-0 items-center justify-center rounded-full bg-slate-300 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300',
          className,
        ].join(' ')}
      >
        {initial}
      </span>
    );
  }

  // 同じ login に対しては常に同じ URL になるよう size は固定 (CSS 側で縮小)。
  // 行ごと / サイドバーで違う size パラメータを使うとブラウザキャッシュも別エントリに
  // なり、ロードが完了せず onError → 文字フォールバックに落ちるケースがあった。
  return (
    <img
      src={`https://github.com/${login}.png?size=64`}
      alt={alt}
      style={style}
      onError={() => setFailed(true)}
      className={['shrink-0 rounded-full bg-slate-300 object-cover dark:bg-slate-700', className].join(' ')}
    />
  );
}

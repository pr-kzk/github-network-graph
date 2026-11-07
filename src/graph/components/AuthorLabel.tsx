import { t } from '@/shared/i18n';
import type { ViewCommit } from '../lib/transform.types';

type AuthorLabelProps = {
  commit: Pick<ViewCommit, 'authorName' | 'authorRepo'>;
};

export function AuthorLabel({ commit }: AuthorLabelProps) {
  return (
    <>
      {commit.authorName || t('commit_unknown_author')}
      {commit.authorRepo && commit.authorName !== commit.authorRepo ? (
        <span className="text-slate-500"> / {commit.authorRepo}</span>
      ) : null}
    </>
  );
}

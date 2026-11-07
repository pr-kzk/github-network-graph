import { useEffect } from 'react';
import { tWith } from '@/shared/i18n';

export function useRepoDocumentTitle(owner: string, repo: string): void {
  useEffect(() => {
    if (!owner || !repo) return;
    document.title = tWith('graph_tab_title', { repo: `${owner}/${repo}` });
  }, [owner, repo]);
}

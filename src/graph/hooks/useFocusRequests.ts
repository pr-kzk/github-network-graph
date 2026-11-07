import { useEffect } from 'react';
import { answerFocusRequests } from '@/shared/graphTabFocus';

export function useFocusRequests(owner: string, repo: string): void {
  useEffect(() => {
    if (!owner || !repo) return undefined;
    return answerFocusRequests(() => ({ owner, repo }));
  }, [owner, repo]);
}

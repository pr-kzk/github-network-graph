import { useMemo, useRef } from 'react';

export type PageSession = {
  generation: () => number;
  signal: () => AbortSignal;
  begin: () => AbortController;
  renewAbort: () => void;
};

export function usePageSession(): PageSession {
  const generation = useRef(0);
  const pagesAbort = useRef(new AbortController());
  return useMemo(
    () => ({
      generation: () => generation.current,
      signal: () => pagesAbort.current.signal,
      begin: () => {
        generation.current += 1;
        pagesAbort.current = new AbortController();
        return pagesAbort.current;
      },
      renewAbort: () => {
        pagesAbort.current.abort();
        pagesAbort.current = new AbortController();
      },
    }),
    [],
  );
}

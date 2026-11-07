import { highlightSegments } from '../lib/commitSearch';

type HighlightedTextProps = {
  text: string;
  query: string;
};

export function HighlightedText({ text, query }: HighlightedTextProps) {
  return highlightSegments(text, query).map((segment) =>
    segment.match ? (
      <mark
        // Keying by the fragment text is avoided: a word matching several times would duplicate keys.
        key={segment.start}
        className="rounded-sm bg-amber-300/70 text-inherit dark:bg-amber-400/40"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

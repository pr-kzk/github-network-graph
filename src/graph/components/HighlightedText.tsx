import { highlightSegments } from '../lib/commitSearch';

type HighlightedTextProps = {
  text: string;
  query: string;
};

export function HighlightedText({ text, query }: HighlightedTextProps) {
  return highlightSegments(text, query).map((segment) =>
    segment.match ? (
      <mark
        // 断片の文字列を key にすると同じ語が複数回一致したとき重複するため採らない。
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

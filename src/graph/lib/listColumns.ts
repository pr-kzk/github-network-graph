const SUBJECT_MIN_WIDTH = 200;
const SHA_WIDTH = 64;
const DATE_WIDTH = 64;
const AUTHOR_WIDTH = 128;
const AVATAR_ONLY_WIDTH = 32;

export type ListColumns = {
  sha: boolean;
  date: boolean;
  authorName: boolean;
};

export function visibleColumns(textAreaWidth: number): ListColumns {
  if (textAreaWidth <= 0) return { sha: true, date: true, authorName: true };
  const fits = (used: number) => textAreaWidth - used >= SUBJECT_MIN_WIDTH;
  if (fits(AUTHOR_WIDTH + SHA_WIDTH + DATE_WIDTH))
    return { sha: true, date: true, authorName: true };
  if (fits(AUTHOR_WIDTH + DATE_WIDTH)) return { sha: false, date: true, authorName: true };
  if (fits(AVATAR_ONLY_WIDTH + DATE_WIDTH)) return { sha: false, date: true, authorName: false };
  return { sha: false, date: false, authorName: false };
}

import { describe, expect, it } from 'vitest';
import en from '../../public/_locales/en/messages.json' with { type: 'json' };
import ja from '../../public/_locales/ja/messages.json' with { type: 'json' };

type Entry = { message: string; placeholders?: Record<string, unknown> };

function placeholdersOf(entries: Record<string, Entry>, key: string): string[] {
  return Object.keys(entries[key].placeholders ?? {}).sort();
}

describe('locale catalogs', () => {
  const english: Record<string, Entry> = en;
  const japanese: Record<string, Entry> = ja;

  it('define the same message keys in English and Japanese', () => {
    expect(Object.keys(japanese).sort()).toEqual(Object.keys(english).sort());
  });

  it('declare the same placeholders in both languages for every message', () => {
    const mismatched = Object.keys(english).filter(
      (key) => placeholdersOf(japanese, key).join() !== placeholdersOf(english, key).join(),
    );
    expect(mismatched).toEqual([]);
  });
});

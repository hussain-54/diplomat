import { blocksToPlainText, type Block } from "@/lib/blocks";

export type WritingStats = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  readingMinutes: number;
  readability: number | null;
  readabilityLabel: string;
};

/** Wrap the current textarea selection with markdown-style marks. */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
): { text: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end) || "text";
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    text: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

export function computeWritingStats(
  title: string,
  deck: string,
  blocks: Block[],
): WritingStats {
  const body = blocksToPlainText(blocks);
  const full = [title, deck, body].filter(Boolean).join("\n\n");
  const words = full.trim() ? full.trim().split(/\s+/).length : 0;
  const characters = full.length;
  const charactersNoSpaces = full.replace(/\s/g, "").length;
  const sentences = (full.match(/[.!?]+(\s|$)/g) ?? []).length || (words ? 1 : 0);
  const readingMinutes = Math.max(1, Math.ceil(words / 230)) || 0;
  const readability = words > 40 ? fleschReadingEase(full, words, sentences) : null;

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    readingMinutes: words === 0 ? 0 : readingMinutes,
    readability,
    readabilityLabel:
      readability == null
        ? "—"
        : readability >= 60
          ? "Easy"
          : readability >= 40
            ? "Standard"
            : "Dense",
  };
}

function fleschReadingEase(text: string, words: number, sentences: number): number {
  const syllables = countSyllables(text);
  const s = Math.max(1, sentences);
  const w = Math.max(1, words);
  const score = 206.835 - 1.015 * (w / s) - 84.6 * (syllables / w);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.reduce((sum, word) => {
    const cleaned = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const groups = cleaned.match(/[aeiouy]{1,2}/g);
    return sum + (groups?.length || 1);
  }, 0);
}

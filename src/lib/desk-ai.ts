/** Local desk heuristics — full model AI ships in Phase 20. */

const GRAMMAR_SWAPS: Array<[RegExp, string]> = [
  [/\bteh\b/gi, "the"],
  [/\badn\b/gi, "and"],
  [/\bwaht\b/gi, "what"],
  [/\brecieve\b/gi, "receive"],
  [/\boccured\b/gi, "occurred"],
  [/\bseperate\b/gi, "separate"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bwich\b/gi, "which"],
  [/\s{2,}/g, " "],
  [/\s+([,.!?;:])/g, "$1"],
];

export function improveWriting(text: string): string {
  let next = text.replace(/\r\n/g, "\n").trim();
  next = next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  next = next.replace(/\s{2,}/g, " ");
  // Light sentence casing: capitalize after . ! ?
  next = next.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
  return next.trim();
}

export function shortenText(text: string, ratio = 0.55): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) {
    const words = text.trim().split(/\s+/);
    const keep = Math.max(8, Math.floor(words.length * ratio));
    return words.slice(0, keep).join(" ") + (words.length > keep ? "…" : "");
  }
  const keep = Math.max(1, Math.ceil(sentences.length * ratio));
  return sentences.slice(0, keep).join(" ");
}

export function expandText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) {
    return `${trimmed} Further context and implications are still unfolding.`;
  }
  return `${trimmed}. Further context and implications are still unfolding.`;
}

export function fixGrammar(text: string): string {
  let next = text;
  for (const [pattern, replacement] of GRAMMAR_SWAPS) {
    next = next.replace(pattern, replacement);
  }
  return next.trim();
}

export function suggestTags(title: string, body: string, limit = 6): string[] {
  const stop = new Set([
    "that",
    "this",
    "with",
    "from",
    "have",
    "been",
    "were",
    "will",
    "into",
    "about",
    "their",
    "there",
    "which",
    "would",
    "could",
    "should",
    "after",
    "before",
    "under",
    "over",
    "more",
    "than",
    "also",
    "when",
    "what",
    "where",
    "while",
    "such",
    "only",
    "other",
    "some",
    "them",
    "they",
    "said",
    "says",
  ]);
  const bag = `${title} ${body}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  const counts = new Map<string, number>();
  for (const word of bag) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function draftSocialPost(title: string, deck: string, maxLen = 240): string {
  const core = [title.trim(), deck.trim()].filter(Boolean).join(" — ");
  if (!core) return "";
  if (core.length <= maxLen) return core;
  return `${core.slice(0, maxLen - 1).trimEnd()}…`;
}

export function transformSelection(
  value: string,
  start: number,
  end: number,
  transform: (selected: string) => string,
): { text: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end);
  if (!selected) {
    const next = transform(value);
    return { text: next, selectionStart: 0, selectionEnd: next.length };
  }
  const replaced = transform(selected);
  const text = value.slice(0, start) + replaced + value.slice(end);
  return {
    text,
    selectionStart: start,
    selectionEnd: start + replaced.length,
  };
}

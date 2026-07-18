/**
 * Clean pasted HTML from Word, Google Docs, and browsers into
 * lightweight markdown-friendly plain text for the block editor.
 */

export function looksLikeRichHtml(html: string): boolean {
  if (!html.trim()) return false;
  return /<(p|div|span|b|strong|i|em|u|a|li|ul|ol|h[1-6]|br|table)\b/i.test(html);
}

export function clipboardToEditorText(data: DataTransfer | null | undefined): string | null {
  if (!data) return null;
  const html = data.getData("text/html");
  const plain = data.getData("text/plain");
  if (html && looksLikeRichHtml(html)) {
    return htmlToEditorText(html);
  }
  return plain.length ? plain : null;
}

/** Convert rich HTML clipboard content into editor text with light markdown marks. */
export function htmlToEditorText(html: string): string {
  const cleaned = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(o|w|m):[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<xml[\s\S]*?<\/xml>/gi, "");

  if (typeof DOMParser === "undefined") {
    return stripTags(cleaned);
  }

  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  const root = doc.body;
  return normalizeNewlines(walk(root)).trim();
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u00a0/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return "\n";
  if (tag === "hr") return "\n\n---\n\n";

  const inner = Array.from(el.childNodes).map(walk).join("");

  if (tag === "strong" || tag === "b") return wrapMark(inner, "**");
  if (tag === "em" || tag === "i") return wrapMark(inner, "*");
  if (tag === "u") return wrapMark(inner, "__");
  if (tag === "s" || tag === "strike" || tag === "del") return wrapMark(inner, "~~");
  if (tag === "code") return `\`${inner.trim()}\``;
  if (tag === "a") {
    const href = el.getAttribute("href")?.trim();
    const label = inner.trim() || href || "";
    if (href && /^https?:\/\//i.test(href)) return `[${label}](${href})`;
    return label;
  }
  if (tag === "li") {
    const parent = el.parentElement?.tagName.toLowerCase();
    const prefix = parent === "ol" ? "1. " : "- ";
    return `${prefix}${inner.trim()}\n`;
  }
  if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
    return `\n\n${inner.trim()}\n\n`;
  }
  if (tag === "p" || tag === "div" || tag === "tr") {
    return `\n\n${inner.trim()}\n\n`;
  }
  if (tag === "td" || tag === "th") {
    return `${inner.trim()}\t`;
  }
  if (tag === "ul" || tag === "ol" || tag === "table" || tag === "tbody" || tag === "thead") {
    return `\n${inner}\n`;
  }
  return inner;
}

function wrapMark(inner: string, mark: string): string {
  const text = inner.trim();
  if (!text) return "";
  return `${mark}${text}${mark}`;
}

function stripTags(html: string): string {
  return normalizeNewlines(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"'),
  ).trim();
}

function normalizeNewlines(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
}

/** Split cleaned paste into paragraph chunks for multi-block insert. */
export function splitPasteParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Detect bullet/numbered lines suitable for a list block. */
export function pasteLooksLikeList(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const listish = lines.filter((l) => /^([-*•]|\d+[.)])\s+/.test(l));
  return listish.length >= Math.ceil(lines.length * 0.6);
}

export function pasteToListItems(text: string): Array<{ text: string; checked?: boolean }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      text: line.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\[[ xX]\]\s*/, ""),
      checked: /^\[[xX]\]/.test(line.replace(/^([-*•]|\d+[.)])\s+/, "")),
    }));
}

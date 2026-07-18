import { Fragment, type ReactNode } from "react";

/** Render lightweight markdown marks used in the block editor (safe text nodes only). */
export function InlineRichText({ text }: { text: string }) {
  if (!text) return null;
  return <>{parseInline(text)}</>;
}

function parseInline(input: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{input.slice(last, match.index)}</Fragment>);
    }
    if (match[2]) nodes.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) nodes.push(<u key={key++}>{match[3]}</u>);
    else if (match[4]) nodes.push(<em key={key++}>{match[4]}</em>);
    else if (match[5]) nodes.push(<s key={key++}>{match[5]}</s>);
    else if (match[6])
      nodes.push(
        <code key={key++} className="rounded bg-secondary px-1 text-[0.9em]">
          {match[6]}
        </code>,
      );
    else if (match[7] && match[8])
      nodes.push(
        <a
          key={key++}
          href={match[8]}
          className="text-crimson underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[7]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    nodes.push(<Fragment key={key++}>{input.slice(last)}</Fragment>);
  }
  return nodes;
}

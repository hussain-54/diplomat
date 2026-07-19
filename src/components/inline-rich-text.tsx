import { Fragment, type ReactNode } from "react";

/** Render lightweight markdown marks used in the block editor (safe text nodes only). */
export function InlineRichText({ text }: { text: string }) {
  if (!text) return null;
  return <>{parseInline(text)}</>;
}

const SIZE_CLASS: Record<string, string> = {
  sm: "text-[0.875em]",
  lg: "text-[1.125em]",
  xl: "text-[1.25em]",
};

function parseInline(input: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|~~(.+?)~~|==(.+?)==|\{#([0-9a-fA-F]{3,8})\}(.+?)\{\/\}|\{size:(sm|lg|xl)\}(.+?)\{\/size\}|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))/g;
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
        <mark key={key++} className="rounded-sm bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30">
          {match[6]}
        </mark>,
      );
    else if (match[7] && match[8])
      nodes.push(
        <span key={key++} style={{ color: `#${match[7]}` }}>
          {match[8]}
        </span>,
      );
    else if (match[9] && match[10])
      nodes.push(
        <span key={key++} className={SIZE_CLASS[match[9]] ?? ""}>
          {match[10]}
        </span>,
      );
    else if (match[11])
      nodes.push(
        <code key={key++} className="rounded bg-secondary px-1 text-[0.9em]">
          {match[11]}
        </code>,
      );
    else if (match[12] && match[13])
      nodes.push(
        <a
          key={key++}
          href={match[13]}
          className="text-crimson underline underline-offset-2"
          target={match[13].startsWith("http") ? "_blank" : undefined}
          rel={match[13].startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {match[12]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    nodes.push(<Fragment key={key++}>{input.slice(last)}</Fragment>);
  }
  return nodes;
}

import { cn } from "@/lib/utils";

const CATEGORY_TONES = [
  "bg-cat-blue/12 text-cat-blue",
  "bg-cat-green/12 text-cat-green",
  "bg-gold/15 text-gold",
  "bg-crimson/12 text-crimson",
  "bg-muted text-muted-foreground",
] as const;

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

export function CategoryPill({ name }: { name: string }) {
  if (!name || name === "Unassigned" || name === "—") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex max-w-[9rem] truncate px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
        toneFor(name),
      )}
      title={name}
    >
      {name}
    </span>
  );
}

export function TagOverflow({
  tags,
  max = 2,
}: {
  tags: Array<{ id: string; name: string }>;
  max?: number;
}) {
  if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
  const visible = tags.slice(0, max);
  const rest = tags.length - visible.length;
  return (
    <div className="flex max-w-[11rem] flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag.id}
          className="bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {tag.name}
        </span>
      ))}
      {rest > 0 ? (
        <details className="relative">
          <summary className="cursor-pointer list-none bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground marker:content-none hover:text-foreground">
            +{rest}
          </summary>
          <div className="absolute right-0 z-20 mt-1 min-w-[8rem] border border-border bg-card p-2 shadow-md">
            <div className="flex flex-wrap gap-1">
              {tags.slice(max).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

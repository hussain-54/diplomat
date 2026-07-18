import type { ReactNode } from "react";
import { Bot, Sparkles, Type, AlignLeft, FileText } from "lucide-react";
import { CmsPanel, cmsSecondaryButton } from "@/components/cms";
import { blocksToPlainText, createBlock, type Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";

/** Local desk helpers for create/edit — full model AI ships in Phase 20. */
export function ArticleAiAssistantPanel({
  title,
  deck,
  blocks,
  readOnly,
  onApplyTitle,
  onApplyDeck,
  onApplyMeta,
  onInsertSummaryBlock,
}: {
  title: string;
  deck: string;
  blocks: Block[];
  readOnly?: boolean;
  onApplyTitle: (title: string) => void;
  onApplyDeck: (deck: string) => void;
  onApplyMeta: (meta: { seo_title?: string; meta_description?: string; focus_keyword?: string }) => void;
  onInsertSummaryBlock: (blocks: Block[]) => void;
}) {
  const plain = blocksToPlainText(blocks).trim();
  const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
  const firstSentence =
    plain
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .find(Boolean) ?? "";

  const headlineOptions = buildHeadlineOptions(title, deck);
  const deckOption =
    deck.trim() ||
    (firstSentence
      ? firstSentence.slice(0, 220)
      : words.slice(0, 28).join(" ") + (words.length > 28 ? "…" : ""));
  const keyword =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ") || "diplomacy";

  return (
    <CmsPanel title="AI Assistant" description="Desk helpers · full AI writing in Phase 20">
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3 border border-border bg-muted/20 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center bg-foreground text-background">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            Generate headline variants, decks, SEO drafts, and a summary block from the story on the
            canvas. Suggestions stay local until the AI Writing service is connected.
          </div>
        </div>

        <AssistantGroup
          icon={Type}
          label="Headline variants"
          disabled={readOnly || !title.trim()}
        >
          {headlineOptions.map((option) => (
            <button
              key={option}
              type="button"
              disabled={readOnly || !option}
              className={cn(cmsSecondaryButton, "w-full justify-start text-left")}
              onClick={() => onApplyTitle(option)}
            >
              {option}
            </button>
          ))}
        </AssistantGroup>

        <AssistantGroup icon={AlignLeft} label="Deck / summary" disabled={readOnly || !deckOption}>
          <button
            type="button"
            disabled={readOnly || !deckOption}
            className={cn(cmsSecondaryButton, "w-full justify-start text-left whitespace-normal")}
            onClick={() => onApplyDeck(deckOption)}
          >
            {deckOption || "Add a headline or body text first"}
          </button>
        </AssistantGroup>

        <AssistantGroup icon={Sparkles} label="SEO draft" disabled={readOnly || !title.trim()}>
          <button
            type="button"
            disabled={readOnly || !title.trim()}
            className={cn(cmsSecondaryButton, "w-full justify-start text-left whitespace-normal")}
            onClick={() =>
              onApplyMeta({
                seo_title: (title.trim() || "Untitled story").slice(0, 60),
                meta_description: (deckOption || title).slice(0, 160),
                focus_keyword: keyword,
              })
            }
          >
            Apply SEO title, meta description, and focus keyword
          </button>
        </AssistantGroup>

        <AssistantGroup icon={FileText} label="Insert summary block" disabled={readOnly || !deckOption}>
          <button
            type="button"
            disabled={readOnly || !deckOption}
            className={cn(cmsSecondaryButton, "w-full justify-start")}
            onClick={() => {
              const quote = createBlock("quote");
              if (quote.type === "quote") {
                quote.data = {
                  text: deckOption,
                  attribution: "Desk summary",
                };
              }
              onInsertSummaryBlock([...blocks, quote]);
            }}
          >
            Append quote block from deck
          </button>
        </AssistantGroup>
      </div>
    </CmsPanel>
  );
}

function AssistantGroup({
  icon: Icon,
  label,
  disabled,
  children,
}: {
  icon: typeof Type;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", disabled && "opacity-60")}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function buildHeadlineOptions(title: string, deck: string) {
  const base = title.trim();
  if (!base) return [] as string[];
  const options = [
    base,
    base.endsWith("?") || base.endsWith(":") ? base : `${base}: what to know`,
    deck.trim()
      ? `${base.split(":")[0].trim()} — ${deck.trim().split(/[.!?]/)[0].slice(0, 48)}`
      : `Analysis: ${base}`,
  ];
  return [...new Set(options.map((option) => option.trim()).filter(Boolean))].slice(0, 3);
}

import { Search, Settings2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  ARTICLE_LANGUAGES,
  CONTENT_TYPES,
  DEFAULT_ARTICLES_FILTERS,
  builtinFilterPresets,
  deleteFilterPreset,
  isArticlesFilterActive,
  loadSavedFilterPresets,
  saveFilterPreset,
  type ArticlesFilterPreset,
  type ArticlesFilterState,
  type ArticleStatus,
} from "@/components/articles/articles-filters";
import { FilterChip, cmsGhostButton, cmsInput, cmsSecondaryButton } from "@/components/cms";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STATUSES: Array<"all" | ArticleStatus> = [
  "all",
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
];

const selectClass = cn(
  cmsInput,
  "h-9 w-[9.25rem] shrink-0 cursor-pointer appearance-none bg-[length:12px] bg-[right_0.65rem_center] bg-no-repeat pr-8 text-[13px] font-medium shadow-none",
  "hover:border-primary/30 focus:border-ring focus:ring-2 focus:ring-ring/20",
);

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
} as const;

type Chip = {
  id: string;
  label: string;
  onRemove: () => void;
};

export function ArticlesCompactFilters({
  filters,
  onChange,
  onClear,
  authors,
  categories,
  tags,
  showStatus = true,
  regions = [],
}: {
  filters: ArticlesFilterState;
  onChange: (next: ArticlesFilterState) => void;
  onClear: () => void;
  authors: Array<[string, string]>;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  showStatus?: boolean;
  regions?: string[];
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<ArticlesFilterPreset[]>(() =>
    loadSavedFilterPresets(),
  );
  const presets = useMemo(
    () => [...builtinFilterPresets(), ...savedPresets],
    [savedPresets],
  );
  const active = isArticlesFilterActive(filters, { ignoreStatus: !showStatus });
  const patch = (partial: Partial<ArticlesFilterState>) => onChange({ ...filters, ...partial });

  const authorLabel =
    filters.author === "all"
      ? null
      : (authors.find(([id]) => id === filters.author)?.[1] ?? "Author");
  const categoryLabel =
    filters.category === "all"
      ? null
      : (categories.find((c) => c.id === filters.category)?.name ?? "Category");
  const tagLabel =
    filters.tag === "all"
      ? null
      : filters.tag === "untagged"
        ? "Untagged"
        : (tags.find((t) => t.id === filters.tag)?.name ?? "Tag");
  const languageLabel =
    filters.language === "all"
      ? null
      : (ARTICLE_LANGUAGES.find((l) => l.id === filters.language)?.label ?? filters.language);
  const regionLabel = filters.region === "all" ? null : filters.region;
  const contentTypeLabel =
    filters.contentType === "all"
      ? null
      : (CONTENT_TYPES.find((t) => t.id === filters.contentType)?.label ?? filters.contentType);

  const chips: Chip[] = [];
  if (filters.search.trim()) {
    chips.push({
      id: "search",
      label: `Search: ${filters.search.trim()}`,
      onRemove: () => patch({ search: "" }),
    });
  }
  if (authorLabel) {
    chips.push({
      id: "author",
      label: `Author: ${authorLabel}`,
      onRemove: () => patch({ author: "all" }),
    });
  }
  if (categoryLabel) {
    chips.push({
      id: "category",
      label: `Category: ${categoryLabel}`,
      onRemove: () => patch({ category: "all" }),
    });
  }
  if (tagLabel) {
    chips.push({
      id: "tag",
      label: `Tag: ${tagLabel}`,
      onRemove: () => patch({ tag: "all" }),
    });
  }
  if (showStatus && filters.status !== "all") {
    chips.push({
      id: "status",
      label: `Status: ${filters.status}`,
      onRemove: () => patch({ status: "all" }),
    });
  }
  if (regionLabel) {
    chips.push({
      id: "region",
      label: `Region: ${regionLabel}`,
      onRemove: () => patch({ region: "all" }),
    });
  }
  if (languageLabel) {
    chips.push({
      id: "language",
      label: `Language: ${languageLabel}`,
      onRemove: () => patch({ language: "all" }),
    });
  }
  if (contentTypeLabel) {
    chips.push({
      id: "contentType",
      label: `Type: ${contentTypeLabel}`,
      onRemove: () => patch({ contentType: "all" }),
    });
  }
  if (filters.seoScore !== "all") {
    chips.push({
      id: "seo",
      label: `SEO: ${filters.seoScore}`,
      onRemove: () => patch({ seoScore: "all" }),
    });
  }
  if (filters.contentScore !== "all") {
    chips.push({
      id: "contentScore",
      label: `Content: ${filters.contentScore}`,
      onRemove: () => patch({ contentScore: "all" }),
    });
  }
  if (filters.eeatScore !== "all") {
    chips.push({
      id: "eeatScore",
      label: `EEAT: ${filters.eeatScore}`,
      onRemove: () => patch({ eeatScore: "all" }),
    });
  }
  if (filters.featured !== "all") {
    chips.push({
      id: "featured",
      label: `Featured: ${filters.featured}`,
      onRemove: () => patch({ featured: "all" }),
    });
  }
  if (filters.googleNews !== "all") {
    chips.push({
      id: "googleNews",
      label: `Google News: ${filters.googleNews}`,
      onRemove: () => patch({ googleNews: "all" }),
    });
  }
  if (filters.priority !== "all") {
    chips.push({
      id: "priority",
      label: `Priority: ${filters.priority}`,
      onRemove: () => patch({ priority: "all" }),
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    const range = [filters.dateFrom || "…", filters.dateTo || "…"].join(" → ");
    chips.push({
      id: "dates",
      label: `Date: ${range}`,
      onRemove: () => patch({ dateFrom: "", dateTo: "" }),
    });
  }
  if (filters.viewsMin || filters.viewsMax) {
    chips.push({
      id: "views",
      label: `Views: ${filters.viewsMin || "0"}–${filters.viewsMax || "∞"}`,
      onRemove: () => patch({ viewsMin: "", viewsMax: "" }),
    });
  }

  const advancedCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.viewsMin,
    filters.viewsMax,
    filters.seoScore !== "all",
    filters.contentScore !== "all",
    filters.eeatScore !== "all",
    filters.featured !== "all",
    filters.googleNews !== "all",
    filters.priority !== "all",
    filters.contentType !== "all",
    filters.region !== "all",
  ].filter(Boolean).length;

  return (
    <>
      <div className="space-y-2.5">
        <div className="rounded-xl border border-border/80 bg-card/90 p-2 shadow-[var(--cms-shadow)]">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1 basis-[240px] md:max-w-sm lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.search}
                onChange={(event) => patch({ search: event.target.value })}
                placeholder="Search by title, slug, keyword…"
                className={cn(
                  cmsInput,
                  "h-9 border-transparent bg-muted/40 pl-9 text-[13px] shadow-none",
                  "hover:border-primary/20 hover:bg-background",
                  "focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20",
                )}
                aria-label="Search articles"
              />
            </label>

            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <PrimarySelects
                filters={filters}
                patch={patch}
                authors={authors}
                categories={categories}
                tags={tags}
                showStatus={showStatus}
                regions={regions}
              />
            </div>

            <button
              type="button"
              className={cn(
                cmsSecondaryButton,
                "h-9 shrink-0",
                advancedCount > 0 && "border-primary/30 bg-primary/5 text-primary",
              )}
              onClick={() => setAdvancedOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">Filters</span>
              {advancedCount > 0 ? (
                <span className="cms-metric rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {advancedCount}
                </span>
              ) : null}
            </button>

            {active ? (
              <button
                type="button"
                className={cn(cmsGhostButton, "ml-auto h-9 shrink-0")}
                onClick={onClear}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            ) : null}
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 px-0.5">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onRemove}
                className="group inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm cms-transition hover:border-cat-rose/40 hover:bg-cat-rose/5 hover:text-cat-rose"
                title={`Remove ${chip.label}`}
              >
                <span className="truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <SheetTitle className="text-base">More filters</SheetTitle>
            <SheetDescription className="text-xs">
              Advanced desk filters stay out of the main toolbar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="space-y-3 md:hidden">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Primary
              </div>
              <div className="grid gap-3 [&_select]:w-full">
                <PrimarySelects
                  filters={filters}
                  patch={patch}
                  authors={authors}
                  categories={categories}
                  tags={tags}
                  showStatus={showStatus}
                  regions={regions}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-0.5">
                    <FilterChip
                      active={false}
                      className="rounded-full"
                      onClick={() =>
                        onChange({
                          ...DEFAULT_ARTICLES_FILTERS,
                          ...preset.filters,
                          status: showStatus ? preset.filters.status : filters.status,
                        })
                      }
                    >
                      {preset.name}
                    </FilterChip>
                    {!preset.builtin ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-cat-rose"
                        onClick={() => setSavedPresets(deleteFilterPreset(preset.id))}
                        aria-label={`Delete ${preset.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Save current as…"
                  className={`${cmsInput} h-8 text-xs`}
                />
                <button
                  type="button"
                  className={cmsSecondaryButton}
                  disabled={!presetName.trim()}
                  onClick={() => {
                    setSavedPresets(saveFilterPreset(presetName, filters));
                    setPresetName("");
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <Field label="Date range">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => patch({ dateFrom: event.target.value })}
                  className={cmsInput}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => patch({ dateTo: event.target.value })}
                  className={cmsInput}
                  aria-label="To date"
                />
              </div>
            </Field>

            <Field label="SEO score">
              <select
                value={filters.seoScore}
                onChange={(event) =>
                  patch({ seoScore: event.target.value as ArticlesFilterState["seoScore"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="weak">Weak (&lt;50)</option>
                <option value="fair">Fair (50–74)</option>
                <option value="strong">Strong (75+)</option>
              </select>
            </Field>

            <Field label="Content score">
              <select
                value={filters.contentScore}
                onChange={(event) =>
                  patch({ contentScore: event.target.value as ArticlesFilterState["contentScore"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="weak">Weak (&lt;50)</option>
                <option value="fair">Fair (50–74)</option>
                <option value="strong">Strong (75+)</option>
              </select>
            </Field>

            <Field label="EEAT score">
              <select
                value={filters.eeatScore}
                onChange={(event) =>
                  patch({ eeatScore: event.target.value as ArticlesFilterState["eeatScore"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="weak">Weak (&lt;50)</option>
                <option value="fair">Fair (50–74)</option>
                <option value="strong">Strong (75+)</option>
              </select>
            </Field>

            <Field label="Views range">
              <div className="grid grid-cols-2 gap-2">
                <input
                  inputMode="numeric"
                  value={filters.viewsMin}
                  onChange={(event) => patch({ viewsMin: event.target.value })}
                  className={cmsInput}
                  placeholder="Min"
                  aria-label="Views minimum"
                />
                <input
                  inputMode="numeric"
                  value={filters.viewsMax}
                  onChange={(event) => patch({ viewsMax: event.target.value })}
                  className={cmsInput}
                  placeholder="Max"
                  aria-label="Views maximum"
                />
              </div>
            </Field>

            <Field label="Content type">
              <select
                value={filters.contentType}
                onChange={(event) =>
                  patch({
                    contentType: event.target.value as ArticlesFilterState["contentType"],
                  })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                {CONTENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={filters.priority}
                onChange={(event) =>
                  patch({ priority: event.target.value as ArticlesFilterState["priority"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>

            <Field label="Featured">
              <select
                value={filters.featured}
                onChange={(event) =>
                  patch({ featured: event.target.value as ArticlesFilterState["featured"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="featured">Featured only</option>
                <option value="standard">Standard only</option>
              </select>
            </Field>

            <Field label="Google News">
              <select
                value={filters.googleNews}
                onChange={(event) =>
                  patch({ googleNews: event.target.value as ArticlesFilterState["googleNews"] })
                }
                className={cn(cmsInput, "cursor-pointer")}
              >
                <option value="all">Any</option>
                <option value="yes">Eligible</option>
                <option value="no">Off</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-2 border-t border-border/60 px-5 py-4">
            <button type="button" className={cmsGhostButton} onClick={onClear}>
              Clear all
            </button>
            <button
              type="button"
              className={`${cmsSecondaryButton} ml-auto`}
              onClick={() => setAdvancedOpen(false)}
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PrimarySelects({
  filters,
  patch,
  authors,
  categories,
  tags,
  showStatus,
  regions,
}: {
  filters: ArticlesFilterState;
  patch: (partial: Partial<ArticlesFilterState>) => void;
  authors: Array<[string, string]>;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  showStatus: boolean;
  regions: string[];
}) {
  return (
    <>
      <select
        value={filters.author}
        onChange={(event) => patch({ author: event.target.value })}
        className={selectClass}
        style={selectStyle}
        aria-label="Author"
      >
        <option value="all">Author</option>
        {authors.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={filters.category}
        onChange={(event) => patch({ category: event.target.value })}
        className={selectClass}
        style={selectStyle}
        aria-label="Category"
      >
        <option value="all">Category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => patch({ tag: event.target.value })}
        className={selectClass}
        style={selectStyle}
        aria-label="Tags"
      >
        <option value="all">Tags</option>
        <option value="untagged">Untagged</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      {showStatus ? (
        <select
          value={filters.status}
          onChange={(event) =>
            patch({ status: event.target.value as ArticlesFilterState["status"] })
          }
          className={selectClass}
          style={selectStyle}
          aria-label="Status"
        >
          <option value="all">Status</option>
          {STATUSES.filter((status) => status !== "all").map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ) : null}
      <select
        value={filters.region}
        onChange={(event) => patch({ region: event.target.value })}
        className={selectClass}
        style={selectStyle}
        aria-label="Region"
      >
        <option value="all">Country</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
      <select
        value={filters.language}
        onChange={(event) => patch({ language: event.target.value })}
        className={selectClass}
        style={selectStyle}
        aria-label="Language"
      >
        <option value="all">Language</option>
        {ARTICLE_LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.label}
          </option>
        ))}
      </select>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/** @deprecated Use ArticlesCompactFilters */
export { ArticlesCompactFilters as ArticlesAdvancedFilters };

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  "scheduled",
  "published",
  "archived",
];

export function ArticlesCompactFilters({
  filters,
  onChange,
  onClear,
  authors,
  categories,
  tags,
  showStatus = true,
}: {
  filters: ArticlesFilterState;
  onChange: (next: ArticlesFilterState) => void;
  onClear: () => void;
  authors: Array<[string, string]>;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  showStatus?: boolean;
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Search articles…"
          className={`${cmsInput} h-9 max-w-xs flex-1 text-sm`}
          aria-label="Search articles"
        />
        {showStatus ? (
          <select
            value={filters.status}
            onChange={(event) =>
              patch({ status: event.target.value as ArticlesFilterState["status"] })
            }
            className={`${cmsInput} h-9 w-auto min-w-[8rem] text-sm`}
            aria-label="Status"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={filters.category}
          onChange={(event) => patch({ category: event.target.value })}
          className={`${cmsInput} h-9 w-auto min-w-[9rem] text-sm`}
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={cn(cmsSecondaryButton, active && "border-foreground/30")}
          onClick={() => setAdvancedOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {active ? <span className="ml-1 text-[10px] font-bold">•</span> : null}
        </button>
        {active ? (
          <button type="button" className={cmsGhostButton} onClick={onClear}>
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        ) : null}
      </div>

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <SheetTitle className="text-base">Advanced filters</SheetTitle>
            <SheetDescription className="text-xs">
              Narrow the desk without crowding the main view.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-0.5">
                    <FilterChip
                      active={false}
                      onClick={() =>
                        onChange({
                          ...DEFAULT_ARTICLES_FILTERS,
                          ...preset.filters,
                          status: showStatus
                            ? preset.filters.status
                            : filters.status,
                        })
                      }
                    >
                      {preset.name}
                    </FilterChip>
                    {!preset.builtin ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-crimson"
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

            <Field label="Author">
              <select
                value={filters.author}
                onChange={(event) => patch({ author: event.target.value })}
                className={cmsInput}
              >
                <option value="all">Anyone</option>
                {authors.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tag">
              <select
                value={filters.tag}
                onChange={(event) => patch({ tag: event.target.value })}
                className={cmsInput}
              >
                <option value="all">Any tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SEO score">
              <select
                value={filters.seoScore}
                onChange={(event) =>
                  patch({ seoScore: event.target.value as ArticlesFilterState["seoScore"] })
                }
                className={cmsInput}
              >
                <option value="all">Any</option>
                <option value="weak">Weak (&lt;50)</option>
                <option value="fair">Fair (50–74)</option>
                <option value="strong">Strong (75+)</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => patch({ dateFrom: event.target.value })}
                  className={cmsInput}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => patch({ dateTo: event.target.value })}
                  className={cmsInput}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Views min">
                <input
                  inputMode="numeric"
                  value={filters.viewsMin}
                  onChange={(event) => patch({ viewsMin: event.target.value })}
                  className={cmsInput}
                  placeholder="0"
                />
              </Field>
              <Field label="Views max">
                <input
                  inputMode="numeric"
                  value={filters.viewsMax}
                  onChange={(event) => patch({ viewsMax: event.target.value })}
                  className={cmsInput}
                  placeholder="∞"
                />
              </Field>
            </div>
            <Field label="Language">
              <select
                value={filters.language}
                onChange={(event) => patch({ language: event.target.value })}
                className={cmsInput}
              >
                <option value="all">Any</option>
                {ARTICLE_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Content type">
              <select
                value={filters.contentType}
                onChange={(event) =>
                  patch({
                    contentType: event.target.value as ArticlesFilterState["contentType"],
                  })
                }
                className={cmsInput}
              >
                <option value="all">Any</option>
                {CONTENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

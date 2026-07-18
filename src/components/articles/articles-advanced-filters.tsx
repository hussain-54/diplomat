import { BookmarkPlus, Save, X } from "lucide-react";
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
import {
  FilterBar,
  FilterChip,
  FilterField,
  cmsGhostButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { cn } from "@/lib/utils";

const STATUSES: Array<"all" | ArticleStatus> = [
  "all",
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
];

export function ArticlesAdvancedFilters({
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
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<ArticlesFilterPreset[]>(() => loadSavedFilterPresets());
  const presets = useMemo(
    () => [...builtinFilterPresets(), ...savedPresets],
    [savedPresets],
  );
  const active = isArticlesFilterActive(filters, { ignoreStatus: !showStatus });

  const patch = (partial: Partial<ArticlesFilterState>) => onChange({ ...filters, ...partial });

  const handleSave = () => {
    const next = saveFilterPreset(presetName, filters);
    setSavedPresets(next);
    setPresetName("");
  };

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/10 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Presets
        </span>
        {presets.map((preset) => (
          <div key={preset.id} className="inline-flex items-center gap-0.5">
            <FilterChip
              active={false}
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
                className="p-1 text-muted-foreground hover:text-crimson"
                title="Delete preset"
                onClick={() => setSavedPresets(deleteFilterPreset(preset.id))}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            className={cn(cmsInput, "h-8 w-40 text-xs")}
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Preset name"
            aria-label="Save filter preset name"
          />
          <button
            type="button"
            className={cmsSecondaryButton}
            onClick={handleSave}
            disabled={!active}
            title="Save current filters"
          >
            <Save className="h-3.5 w-3.5" /> Save filters
          </button>
          {active ? (
            <button type="button" className={cmsGhostButton} onClick={onClear}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <FilterBar
        className="border-b-0"
        onClear={active ? onClear : undefined}
        trailing={
          active ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <BookmarkPlus className="h-3.5 w-3.5" /> Filters active
            </span>
          ) : null
        }
      >
        <FilterField label="Search">
          <input
            className={cmsInput}
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Title or slug"
          />
        </FilterField>
        <FilterField label="Author">
          <select
            className={cmsInput}
            value={filters.author}
            onChange={(event) => patch({ author: event.target.value })}
          >
            <option value="all">All authors</option>
            {authors.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select
            className={cmsInput}
            value={filters.category}
            onChange={(event) => patch({ category: event.target.value })}
          >
            <option value="all">All categories</option>
            {categories.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Tags">
          <select
            className={cmsInput}
            value={filters.tag}
            onChange={(event) => patch({ tag: event.target.value })}
          >
            <option value="all">All tags</option>
            <option value="untagged">Untagged</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </FilterField>
        {showStatus ? (
          <FilterField label="Status">
            <select
              className={cmsInput}
              value={filters.status}
              onChange={(event) =>
                patch({ status: event.target.value as ArticlesFilterState["status"] })
              }
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>
        ) : null}
        <FilterField label="Language">
          <select
            className={cmsInput}
            value={filters.language}
            onChange={(event) => patch({ language: event.target.value })}
          >
            <option value="all">All languages</option>
            {ARTICLE_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Content type">
          <select
            className={cmsInput}
            value={filters.contentType}
            onChange={(event) =>
              patch({ contentType: event.target.value as ArticlesFilterState["contentType"] })
            }
          >
            <option value="all">All types</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="SEO score">
          <select
            className={cmsInput}
            value={filters.seoScore}
            onChange={(event) =>
              patch({ seoScore: event.target.value as ArticlesFilterState["seoScore"] })
            }
          >
            <option value="all">Any score</option>
            <option value="weak">Weak (&lt;50)</option>
            <option value="fair">Fair (50–74)</option>
            <option value="strong">Strong (75+)</option>
          </select>
        </FilterField>
        <FilterField label="Updated from">
          <input
            type="date"
            className={cmsInput}
            value={filters.dateFrom}
            onChange={(event) => patch({ dateFrom: event.target.value })}
          />
        </FilterField>
        <FilterField label="Updated to">
          <input
            type="date"
            className={cmsInput}
            value={filters.dateTo}
            onChange={(event) => patch({ dateTo: event.target.value })}
          />
        </FilterField>
        <FilterField label="Views min">
          <input
            type="number"
            min={0}
            className={cmsInput}
            value={filters.viewsMin}
            onChange={(event) => patch({ viewsMin: event.target.value })}
            placeholder="0"
          />
        </FilterField>
        <FilterField label="Views max">
          <input
            type="number"
            min={0}
            className={cmsInput}
            value={filters.viewsMax}
            onChange={(event) => patch({ viewsMax: event.target.value })}
            placeholder="No max"
          />
        </FilterField>
      </FilterBar>
    </div>
  );
}

function statusLabel(status: "all" | ArticleStatus) {
  if (status === "all") return "All statuses";
  if (status === "review") return "In Review";
  return status[0].toUpperCase() + status.slice(1);
}

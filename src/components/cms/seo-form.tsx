import { X } from "lucide-react";
import { CmsPanel, cmsInput } from "@/components/cms-ui";
import { Field } from "@/components/cms/field";
import type { ArticleSeoInput } from "@/lib/admin.functions";
import { seoLengthTone, siteUrl } from "@/lib/seo";

export type SEOFormValue = ArticleSeoInput;

export function SEOForm({
  value,
  onChange,
  slug,
  onSlugChange,
  titleFallback,
  deckFallback,
  heroImageUrl,
  hreflangRows,
  onHreflangChange,
  readOnly = false,
  publicationName = "Diplomacy Lens",
  showSocial = true,
  showSeo = true,
}: {
  value: SEOFormValue;
  onChange: (patch: Partial<SEOFormValue>) => void;
  slug: string;
  onSlugChange?: (slug: string) => void;
  titleFallback: string;
  deckFallback: string;
  heroImageUrl?: string;
  hreflangRows: Array<{ locale: string; url: string }>;
  onHreflangChange: (rows: Array<{ locale: string; url: string }>) => void;
  readOnly?: boolean;
  publicationName?: string;
  showSocial?: boolean;
  showSeo?: boolean;
}) {
  const seoTitle = value.seo_title?.trim() || titleFallback;
  const metaDescription = value.meta_description?.trim() || deckFallback;
  const canonical = value.canonical_url?.trim() || `${siteUrl()}/article/${slug || "slug"}`;

  return (
    <div className="space-y-6">
      {showSeo ? (
      <CmsPanel title="SEO" description="Search metadata, robots, schema, and previews">
        <div className="space-y-4 p-5">
          <Field label="SEO title" hint="50–60 characters ideal">
            <input
              className={cmsInput}
              value={value.seo_title ?? ""}
              disabled={readOnly}
              onChange={(event) => onChange({ seo_title: event.target.value })}
              placeholder={titleFallback}
            />
            <LengthGuide length={(value.seo_title ?? "").length} min={50} max={60} />
          </Field>

          <Field label="Meta description" hint="120–160 characters ideal">
            <textarea
              className={`${cmsInput} h-auto py-2`}
              rows={3}
              value={value.meta_description ?? ""}
              disabled={readOnly}
              onChange={(event) => onChange({ meta_description: event.target.value })}
              placeholder={deckFallback}
            />
            <LengthGuide length={(value.meta_description ?? "").length} min={120} max={160} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Focus keyword">
              <input
                className={cmsInput}
                value={value.focus_keyword ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ focus_keyword: event.target.value })}
              />
            </Field>
            <Field label="Canonical URL">
              <input
                className={cmsInput}
                value={value.canonical_url ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ canonical_url: event.target.value })}
                placeholder={canonical}
              />
            </Field>
          </div>

          {onSlugChange && (
            <Field label="Slug">
              <input
                className={cmsInput}
                value={slug}
                disabled={readOnly}
                onChange={(event) => onSlugChange(event.target.value)}
              />
            </Field>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BinaryChoice
              label="Robots index"
              value={value.robots_index}
              trueLabel="Index"
              falseLabel="Noindex"
              disabled={readOnly}
              onChange={(robots_index) => onChange({ robots_index })}
            />
            <BinaryChoice
              label="Robots follow"
              value={value.robots_follow}
              trueLabel="Follow"
              falseLabel="Nofollow"
              disabled={readOnly}
              onChange={(robots_follow) => onChange({ robots_follow })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Schema type">
              <select
                className={cmsInput}
                value={value.schema_type}
                disabled={readOnly}
                onChange={(event) =>
                  onChange({
                    schema_type: event.target.value as SEOFormValue["schema_type"],
                  })
                }
              >
                {["NewsArticle", "Article", "Review", "Report"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="RSS inclusion">
              <select
                className={cmsInput}
                value={value.rss_inclusion ? "yes" : "no"}
                disabled={readOnly}
                onChange={(event) =>
                  onChange({ rss_inclusion: event.target.value === "yes" })
                }
              >
                <option value="yes">Include in RSS</option>
                <option value="no">Exclude from RSS</option>
              </select>
            </Field>
          </div>

          <GoogleSerpPreview
            title={seoTitle}
            description={metaDescription}
            url={canonical}
            keyword={value.focus_keyword ?? ""}
            publicationName={publicationName}
          />

          <HreflangEditor
            rows={hreflangRows}
            readOnly={readOnly}
            onChange={onHreflangChange}
          />
        </div>
      </CmsPanel>
      ) : null}

      {showSocial && (
        <CmsPanel title="Social" description="Open Graph and Twitter card overrides">
          <div className="space-y-4 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Open Graph
            </div>
            <Field label="OG title" hint="falls back to SEO title">
              <input
                className={cmsInput}
                value={value.og_title ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ og_title: event.target.value })}
              />
            </Field>
            <Field label="OG description" hint="falls back to meta description">
              <textarea
                className={`${cmsInput} h-auto py-2`}
                rows={2}
                value={value.og_description ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ og_description: event.target.value })}
              />
            </Field>
            <Field label="OG image URL" hint="falls back to lead image">
              <input
                className={cmsInput}
                value={value.og_image_url ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ og_image_url: event.target.value })}
              />
            </Field>

            <div className="border-t border-border pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Twitter / X
            </div>
            <Field label="Card type">
              <select
                className={cmsInput}
                value={value.twitter_card}
                disabled={readOnly}
                onChange={(event) =>
                  onChange({
                    twitter_card: event.target.value as SEOFormValue["twitter_card"],
                  })
                }
              >
                <option value="summary_large_image">Large image</option>
                <option value="summary">Summary</option>
              </select>
            </Field>
            <Field label="Twitter title" hint="falls back to OG title">
              <input
                className={cmsInput}
                value={value.twitter_title ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ twitter_title: event.target.value })}
              />
            </Field>
            <Field label="Twitter description">
              <textarea
                className={`${cmsInput} h-auto py-2`}
                rows={2}
                value={value.twitter_description ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ twitter_description: event.target.value })}
              />
            </Field>
            <Field label="Twitter image URL">
              <input
                className={cmsInput}
                value={value.twitter_image_url ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ twitter_image_url: event.target.value })}
              />
            </Field>
            <SocialPreview
              title={value.og_title || value.seo_title || titleFallback}
              description={value.og_description || value.meta_description || deckFallback}
              image={value.og_image_url || heroImageUrl || ""}
            />
          </div>
        </CmsPanel>
      )}
    </div>
  );
}

function LengthGuide({ length, min, max }: { length: number; min: number; max: number }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden bg-muted">
        <div
          className={`h-full transition-all ${
            length >= min && length <= max ? "bg-cat-green" : "bg-crimson"
          }`}
          style={{ width: `${Math.min(100, (length / max) * 100)}%` }}
        />
      </div>
      <span className={`text-[10px] ${seoLengthTone(length, min, max)}`}>
        {length < min ? `${min - length} short` : length > max ? `${length - max} over` : "Good"}
      </span>
    </div>
  );
}

function GoogleSerpPreview({
  title,
  description,
  url,
  keyword,
  publicationName,
}: {
  title: string;
  description: string;
  url: string;
  keyword: string;
  publicationName: string;
}) {
  const emphasize = (text: string) => {
    if (!keyword.trim()) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <strong key={index}>{part}</strong>
      ) : (
        part
      ),
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Google SERP preview</span>
        <span className="text-[10px] text-muted-foreground">Desktop</span>
      </div>
      <div className="overflow-hidden border border-border bg-white p-4 text-[#202124] dark:bg-white">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f3f4] font-bold text-[#3c4043]">
            {publicationName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="text-[#202124]">{publicationName}</div>
            <div className="max-w-full truncate text-[10px] text-[#4d5156]">
              {url || siteUrl()}
            </div>
          </div>
        </div>
        <div className="mt-2 line-clamp-1 font-sans text-lg leading-6 text-[#1a0dab]">
          {emphasize(title || "Headline appears here")}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#4d5156]">
          {emphasize(
            description ||
              "Add a meta description to explain what readers will find on this page.",
          )}
        </p>
      </div>
    </div>
  );
}

function BinaryChoice({
  label,
  value,
  trueLabel,
  falseLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  trueLabel: string;
  falseLabel: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 border border-input">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`h-8 text-[10px] font-semibold ${
            value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
          }`}
        >
          {trueLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`h-8 text-[10px] font-semibold ${
            !value ? "bg-crimson text-white" : "bg-background text-muted-foreground"
          }`}
        >
          {falseLabel}
        </button>
      </div>
    </div>
  );
}

function HreflangEditor({
  rows,
  readOnly,
  onChange,
}: {
  rows: Array<{ locale: string; url: string }>;
  readOnly: boolean;
  onChange: (rows: Array<{ locale: string; url: string }>) => void;
}) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-foreground">hreflang</div>
          <div className="text-[11px] text-muted-foreground">
            Alternate language or regional URLs
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange([...rows, { locale: "", url: "" }])}
            className="border border-input px-2 py-1 text-[10px] font-semibold hover:bg-accent"
          >
            + Language
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[82px_1fr_24px] gap-1">
              <input
                value={row.locale}
                disabled={readOnly}
                onChange={(event) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, locale: event.target.value } : item,
                    ),
                  )
                }
                placeholder="en-US"
                aria-label="Language code"
                className={`${cmsInput} px-2 text-xs`}
              />
              <input
                type="url"
                value={row.url}
                disabled={readOnly}
                onChange={(event) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  )
                }
                placeholder="https://…"
                aria-label="Alternate URL"
                className={`${cmsInput} px-2 text-xs`}
              />
              <button
                type="button"
                disabled={readOnly}
                title="Remove alternate"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-crimson"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialPreview({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-foreground">Card preview</div>
      <div className="overflow-hidden border border-border bg-background">
        {image ? (
          <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
            Social image preview
          </div>
        )}
        <div className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">diplomacylens.com</div>
          <div className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
            {title || "Article title"}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {description || "Article description"}
          </p>
        </div>
      </div>
    </div>
  );
}

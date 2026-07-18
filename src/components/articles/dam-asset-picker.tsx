import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FolderOpen, Image as ImageIcon, Search, X } from "lucide-react";
import { listMediaAssets, type MediaAssetRow } from "@/lib/admin.functions";
import type { MediaAssetType } from "@/lib/dam";
import { formatBytes } from "@/lib/dam";
import { cmsInput, cmsSecondaryButton } from "@/components/cms";
import { cn } from "@/lib/utils";

export type DamPickResult = {
  url: string;
  fileName: string;
  mimeType: string;
  alt: string;
  caption: string;
  credit: string;
  assetType: MediaAssetType;
};

export function DamAssetPicker({
  open,
  onClose,
  onPick,
  assetType = "image",
  title = "Media library",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (asset: DamPickResult) => void;
  assetType?: MediaAssetType | "all";
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const assets = useQuery({
    queryKey: ["media-assets", "editor-picker", assetType],
    queryFn: () => listMediaAssets({ asset_type: assetType }),
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const rows = assets.data ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows.slice(0, 48);
    return rows
      .filter(
        (row) =>
          row.file_name.toLowerCase().includes(needle) ||
          row.alt_text?.toLowerCase().includes(needle) ||
          row.caption?.toLowerCase().includes(needle),
      )
      .slice(0, 48);
  }, [assets.data, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            {title}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close library"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file name, alt, or caption…"
              className={`${cmsInput} h-9 pl-8 text-xs`}
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {assets.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading library…</div>
          ) : assets.isError ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-crimson">{(assets.error as Error).message}</p>
              <p className="text-xs text-muted-foreground">
                You may need the media:view permission, or the DAM tables may not be migrated yet.
              </p>
              <button type="button" className={cmsSecondaryButton} onClick={onClose}>
                Close
              </button>
            </div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No assets found. Upload files in Media Library first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onPick={() => {
                    onPick({
                      url: asset.public_url,
                      fileName: asset.file_name,
                      mimeType: asset.mime_type,
                      alt: asset.alt_text ?? "",
                      caption: asset.caption ?? "",
                      credit: asset.copyright ?? "",
                      assetType: asset.asset_type,
                    });
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetCard({ asset, onPick }: { asset: MediaAssetRow; onPick: () => void }) {
  const isImage = asset.asset_type === "image" || asset.mime_type.startsWith("image/");
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group flex flex-col overflow-hidden border border-border bg-background text-left transition-colors hover:border-ring hover:bg-accent/40",
      )}
    >
      <div className="flex aspect-square items-center justify-center bg-muted/40">
        {isImage ? (
          <img src={asset.public_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center text-[10px] text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            {asset.asset_type}
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <div className="truncate text-[11px] font-semibold">{asset.file_name}</div>
        <div className="text-[10px] text-muted-foreground">{formatBytes(asset.size_bytes)}</div>
      </div>
    </button>
  );
}

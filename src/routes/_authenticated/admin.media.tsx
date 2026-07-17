import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ImagePlus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  cmsButton,
  cmsInput,
} from "@/components/cms-ui";
import {
  deleteMediaAsset,
  listMediaAssets,
  updateMediaAsset,
  uploadHeroImage,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: MediaPage,
});

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function MediaPage() {
  const queryClient = useQueryClient();
  const media = useQuery({ queryKey: ["media-assets"], queryFn: listMediaAssets });
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<{ id: string; value: string } | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) =>
      uploadHeroImage({
        data: {
          fileName: file.name,
          contentType: file.type,
          base64: await fileToBase64(file),
          bucket: "article-hero",
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-assets"] }),
  });
  const update = useMutation({
    mutationFn: (value: { id: string; alt_text: string }) => updateMediaAsset({ data: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
      setEditingAlt(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMediaAsset({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-assets"] }),
  });

  const assets = useMemo(() => {
    const all = media.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (asset) =>
        asset.file_name.toLowerCase().includes(query) ||
        asset.alt_text?.toLowerCase().includes(query),
    );
  }, [media.data, search]);
  const totalBytes = (media.data ?? []).reduce((sum, asset) => sum + asset.size_bytes, 0);
  const error = media.error ?? upload.error ?? update.error ?? remove.error;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Digital asset management"
        title="Media Library"
        description={`${media.data?.length ?? 0} indexed assets · ${(totalBytes / 1024 / 1024).toFixed(1)} MB`}
        actions={
          <label className={`${cmsButton} cursor-pointer`}>
            <ImagePlus className="h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload image"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
          </label>
        }
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}

      <CmsPanel
        title="Asset index"
        description="Images uploaded through the newsroom CMS"
        action={
          <label className="relative block w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className={`${cmsInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search filename or alt text"
            />
          </label>
        }
      >
        {media.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading media library…</div>
        ) : !assets.length ? (
          <CmsEmptyState
            title="No media found"
            description="Upload an image to make it available to newsroom staff."
          />
        ) : (
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assets.map((asset) => (
              <article key={asset.id} className="bg-card">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={asset.public_url}
                    alt={asset.alt_text || asset.file_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="truncate text-sm font-semibold text-foreground">{asset.file_name}</div>
                    <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>{asset.mime_type.replace("image/", "")}</span>
                      <span>{(asset.size_bytes / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  {editingAlt?.id === asset.id ? (
                    <div className="flex gap-2">
                      <input
                        className={cmsInput}
                        value={editingAlt.value}
                        autoFocus
                        onChange={(event) => setEditingAlt({ id: asset.id, value: event.target.value })}
                        placeholder="Describe this image"
                      />
                      <button
                        type="button"
                        className="border border-input px-3"
                        onClick={() => update.mutate({ id: asset.id, alt_text: editingAlt.value })}
                        aria-label="Save alt text"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="block w-full truncate text-left text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingAlt({ id: asset.id, value: asset.alt_text ?? "" })}
                    >
                      {asset.alt_text || "Add accessibility description…"}
                    </button>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={async () => {
                          await navigator.clipboard.writeText(asset.public_url);
                          setCopied(asset.id);
                          window.setTimeout(() => setCopied(null), 1500);
                        }}
                        aria-label="Copy image URL"
                      >
                        {copied === asset.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:bg-crimson/10 hover:text-crimson"
                        onClick={() => {
                          if (window.confirm(`Permanently delete ${asset.file_name}?`)) remove.mutate(asset.id);
                        }}
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

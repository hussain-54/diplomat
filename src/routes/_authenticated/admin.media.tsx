import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  FileAudio,
  FileText,
  Film,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  ImagePlus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  deleteMediaAsset,
  deleteMediaFolder,
  getMe,
  listMediaAssetUsages,
  listMediaAssets,
  listMediaFolders,
  moveMediaAssets,
  syncMediaAssetUsages,
  updateMediaAsset,
  uploadMediaAsset,
  uploadMediaAssetsBulk,
  upsertMediaFolder,
  type MediaAssetRow,
} from "@/lib/admin.functions";
import {
  assetTypeLabel,
  buildFolderTree,
  DAM_ACCEPT,
  flattenFolderTree,
  folderDescendantIds,
  formatBytes,
  type MediaAssetType,
  type MediaFolder,
} from "@/lib/dam";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/media")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "media:view"),
  component: MediaPage,
});

type TypeFilter = MediaAssetType | "all";
type FolderFilter = string | null | "all" | "unfiled";

const TYPE_FILTERS: Array<{ id: TypeFilter; label: string; icon: typeof ImageIcon }> = [
  { id: "all", label: "All", icon: ImagePlus },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "video", label: "Videos", icon: Film },
  { id: "audio", label: "Audio", icon: FileAudio },
  { id: "document", label: "Documents", icon: FileText },
];

function usageCount(asset: MediaAssetRow) {
  return asset.media_asset_usages?.[0]?.count ?? 0;
}

function AssetPreview({ asset, className }: { asset: MediaAssetRow; className?: string }) {
  if (asset.asset_type === "image") {
    return (
      <img
        src={asset.public_url}
        alt={asset.alt_text || asset.file_name}
        className={className ?? "h-full w-full object-cover"}
        loading="lazy"
      />
    );
  }
  if (asset.asset_type === "video") {
    return (
      <video
        src={asset.public_url}
        className={className ?? "h-full w-full object-cover"}
        muted
        preload="metadata"
      />
    );
  }
  if (asset.asset_type === "audio") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4">
        <FileAudio className="h-8 w-8 text-muted-foreground" />
        <audio src={asset.public_url} controls className="w-full max-w-xs" preload="metadata" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {asset.mime_type.split("/").pop()}
      </span>
    </div>
  );
}

function MediaPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const folders = useQuery({ queryKey: ["media-folders"], queryFn: listMediaFolders });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const media = useQuery({
    queryKey: ["media-assets", typeFilter, folderFilter === "unfiled" ? "unfiled" : "all"],
    queryFn: () =>
      listMediaAssets({
        asset_type: typeFilter,
        folder_id: folderFilter === "unfiled" ? "unfiled" : undefined,
      }),
  });

  const detailAsset = useMemo(
    () => (media.data ?? []).find((asset) => asset.id === detailId) ?? null,
    [media.data, detailId],
  );

  const usages = useQuery({
    queryKey: ["media-usages", detailId],
    queryFn: () => listMediaAssetUsages({ data: { asset_id: detailId! } }),
    enabled: !!detailId,
  });

  const folderRows = (folders.data ?? []) as MediaFolder[];
  const folderTree = useMemo(() => buildFolderTree(folderRows), [folderRows]);
  const flatFolders = useMemo(() => flattenFolderTree(folderTree), [folderTree]);

  const assets = useMemo(() => {
    const all = media.data ?? [];
    const query = search.trim().toLowerCase();
    let rows = all;
    if (folderFilter !== "all" && folderFilter !== "unfiled" && folderFilter) {
      const ids = folderDescendantIds(folderRows, folderFilter);
      rows = rows.filter((asset) => asset.folder_id && ids.has(asset.folder_id));
    }
    if (!query) return rows;
    return rows.filter(
      (asset) =>
        asset.file_name.toLowerCase().includes(query) ||
        asset.alt_text?.toLowerCase().includes(query) ||
        asset.caption?.toLowerCase().includes(query) ||
        asset.copyright?.toLowerCase().includes(query),
    );
  }, [media.data, search, folderFilter, folderRows]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["media-assets"] }),
      queryClient.invalidateQueries({ queryKey: ["media-folders"] }),
      queryClient.invalidateQueries({ queryKey: ["media-usages"] }),
    ]);
  };

  const uploadOne = useMutation({
    mutationFn: (file: File) =>
      uploadMediaAsset({
        data: {
          file,
          folder_id: folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null,
          bucket: "media-library",
        },
      }),
    onSuccess: invalidate,
  });

  const uploadBulk = useMutation({
    mutationFn: async (files: File[]) => {
      setUploadProgress(`Uploading 0 / ${files.length}`);
      const result = await uploadMediaAssetsBulk({
        data: {
          files,
          folder_id: folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null,
        },
      });
      setUploadProgress(null);
      return result;
    },
    onSuccess: async (result) => {
      await invalidate();
      if (result.failed) {
        window.alert(
          `Uploaded ${result.uploaded}, failed ${result.failed}.\n` +
            result.results
              .filter((row) => !row.ok)
              .map((row) => `${row.fileName}: ${row.error}`)
              .join("\n"),
        );
      }
    },
    onError: () => setUploadProgress(null),
  });

  const update = useMutation({
    mutationFn: updateMediaAsset,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMediaAsset({ data: { id } }),
    onSuccess: async () => {
      setDetailId(null);
      await invalidate();
    },
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      upsertMediaFolder({
        data: {
          name,
          parent_id:
            folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null,
        },
      }),
    onSuccess: async () => {
      setNewFolderName("");
      setCreatingFolder(false);
      await invalidate();
    },
  });

  const removeFolder = useMutation({
    mutationFn: (id: string) => deleteMediaFolder({ data: { id } }),
    onSuccess: async () => {
      if (folderFilter !== "all" && folderFilter !== "unfiled") setFolderFilter("all");
      await invalidate();
    },
  });

  const move = useMutation({
    mutationFn: (folder_id: string | null) =>
      moveMediaAssets({ data: { ids: [...selectedIds], folder_id } }),
    onSuccess: async () => {
      setSelectedIds(new Set());
      await invalidate();
    },
  });

  const syncUsages = useMutation({
    mutationFn: syncMediaAssetUsages,
    onSuccess: invalidate,
  });

  const totalBytes = (media.data ?? []).reduce((sum, asset) => sum + asset.size_bytes, 0);
  const error =
    media.error ??
    folders.error ??
    uploadOne.error ??
    uploadBulk.error ??
    update.error ??
    remove.error ??
    createFolder.error ??
    removeFolder.error ??
    move.error ??
    syncUsages.error;
  const canUpload = hasPermission(me.data?.roles, "media:upload");
  const canManageAll = hasPermission(me.data?.roles, "media:manage_all");
  const canEditAsset = (asset: MediaAssetRow) =>
    canManageAll || asset.uploaded_by === me.data?.userId;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFiles = (fileList: FileList | null, bulk: boolean) => {
    if (!fileList?.length) return;
    const files = [...fileList];
    if (bulk || files.length > 1) uploadBulk.mutate(files);
    else uploadOne.mutate(files[0]);
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Digital asset management"
        title="Media Library"
        description={`${assets.length} assets · ${formatBytes(totalBytes)} · images, video, audio, documents`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cmsSecondaryButton}
              onClick={() => syncUsages.mutate()}
              disabled={syncUsages.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${syncUsages.isPending ? "animate-spin" : ""}`} />
              {syncUsages.isPending ? "Syncing…" : "Sync usage"}
            </button>
            {canUpload ? (
              <>
                <label className={`${cmsSecondaryButton} cursor-pointer`}>
                  <Upload className="h-4 w-4" />
                  Bulk upload
                  <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept={DAM_ACCEPT}
                    disabled={uploadBulk.isPending || uploadOne.isPending}
                    onChange={(event) => {
                      handleFiles(event.target.files, true);
                      event.target.value = "";
                    }}
                  />
                </label>
                <label className={`${cmsButton} cursor-pointer`}>
                  <ImagePlus className="h-4 w-4" />
                  {uploadOne.isPending || uploadBulk.isPending
                    ? uploadProgress || "Uploading…"
                    : "Upload"}
                  <input
                    className="sr-only"
                    type="file"
                    accept={DAM_ACCEPT}
                    disabled={uploadBulk.isPending || uploadOne.isPending}
                    onChange={(event) => {
                      handleFiles(event.target.files, false);
                      event.target.value = "";
                    }}
                  />
                </label>
              </>
            ) : null}
          </div>
        }
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <CmsPanel title="Folders" description="Organize library assets">
          <div className="space-y-1 p-2">
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                folderFilter === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
              }`}
              onClick={() => setFolderFilter("all")}
            >
              <Folder className="h-4 w-4" />
              All assets
            </button>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                folderFilter === "unfiled"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60"
              }`}
              onClick={() => setFolderFilter("unfiled")}
            >
              <Folder className="h-4 w-4" />
              Unfiled
            </button>
            {flatFolders.map((folder) => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm ${
                    folderFilter === folder.id
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60"
                  }`}
                  style={{ paddingLeft: `${12 + folder.depth * 14}px` }}
                  onClick={() => setFolderFilter(folder.id)}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
                {canUpload && (
                  <button
                    type="button"
                    className="invisible p-1 text-muted-foreground hover:text-crimson group-hover:visible"
                    aria-label={`Delete ${folder.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete folder “${folder.name}”?`)) {
                        removeFolder.mutate(folder.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canUpload && (
            <div className="border-t border-border p-3">
              {creatingFolder ? (
                <div className="flex gap-2">
                  <input
                    className={cmsInput}
                    value={newFolderName}
                    autoFocus
                    placeholder="Folder name"
                    onChange={(event) => setNewFolderName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newFolderName.trim()) {
                        createFolder.mutate(newFolderName.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={cmsButton}
                    disabled={!newFolderName.trim() || createFolder.isPending}
                    onClick={() => createFolder.mutate(newFolderName.trim())}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="p-2 text-muted-foreground"
                    onClick={() => {
                      setCreatingFolder(false);
                      setNewFolderName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${cmsSecondaryButton} w-full`}
                  onClick={() => setCreatingFolder(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  New folder
                </button>
              )}
            </div>
          )}
        </CmsPanel>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const active = typeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs uppercase tracking-wide ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                  onClick={() => setTypeFilter(filter.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              );
            })}
            <label className="relative ml-auto block w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${cmsInput} pl-9`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, alt, caption, copyright"
              />
            </label>
          </div>

          {selectedIds.size > 0 && canUpload && (
            <div className="flex flex-wrap items-center gap-3 border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <select
                className={cmsInput}
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  move.mutate(value === "__unfiled" ? null : value);
                  event.target.value = "";
                }}
              >
                <option value="">Move to folder…</option>
                <option value="__unfiled">Unfiled</option>
                {flatFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {"—".repeat(folder.depth)} {folder.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}

          <CmsPanel
            title={typeFilter === "all" ? "Asset index" : assetTypeLabel(typeFilter)}
            description="Preview assets and open details to edit metadata"
          >
            {media.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading media library…</div>
            ) : !assets.length ? (
              <CmsEmptyState
                title="No media found"
                description="Upload images, videos, audio, or documents to build the library."
              />
            ) : (
              <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {assets.map((asset) => (
                  <article key={asset.id} className="group relative bg-card">
                    {canUpload && (
                      <label className="absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center border border-border bg-card/90">
                        <input
                          type="checkbox"
                          className="accent-foreground"
                          checked={selectedIds.has(asset.id)}
                          onChange={() => toggleSelected(asset.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setDetailId(asset.id)}
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-muted">
                        <AssetPreview asset={asset} />
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {asset.file_name}
                        </div>
                        <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>{asset.asset_type}</span>
                          <span>{formatBytes(asset.size_bytes)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{usageCount(asset)} uses</span>
                          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </CmsPanel>
        </div>
      </div>

      <Sheet open={!!detailAsset} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detailAsset && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{detailAsset.file_name}</SheetTitle>
                <SheetDescription>
                  {detailAsset.asset_type} · {detailAsset.mime_type} ·{" "}
                  {formatBytes(detailAsset.size_bytes)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="aspect-video overflow-hidden border border-border bg-muted">
                  <AssetPreview asset={detailAsset} />
                </div>

                {detailAsset.asset_type === "document" && (
                  <a
                    href={detailAsset.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${cmsSecondaryButton} inline-flex`}
                  >
                    Open document
                  </a>
                )}

                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Alt text
                    </span>
                    <textarea
                      className={`${cmsInput} min-h-[72px]`}
                      defaultValue={detailAsset.alt_text ?? ""}
                      disabled={!canEditAsset(detailAsset) || update.isPending}
                      onBlur={(event) => {
                        if (!canEditAsset(detailAsset)) return;
                        if ((event.target.value || "") === (detailAsset.alt_text ?? "")) return;
                        update.mutate({
                          data: { id: detailAsset.id, alt_text: event.target.value },
                        });
                      }}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Caption
                    </span>
                    <textarea
                      className={`${cmsInput} min-h-[72px]`}
                      defaultValue={detailAsset.caption ?? ""}
                      disabled={!canEditAsset(detailAsset) || update.isPending}
                      onBlur={(event) => {
                        if (!canEditAsset(detailAsset)) return;
                        if ((event.target.value || "") === (detailAsset.caption ?? "")) return;
                        update.mutate({
                          data: { id: detailAsset.id, caption: event.target.value },
                        });
                      }}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Copyright
                    </span>
                    <input
                      className={cmsInput}
                      defaultValue={detailAsset.copyright ?? ""}
                      disabled={!canEditAsset(detailAsset) || update.isPending}
                      onBlur={(event) => {
                        if (!canEditAsset(detailAsset)) return;
                        if ((event.target.value || "") === (detailAsset.copyright ?? "")) return;
                        update.mutate({
                          data: { id: detailAsset.id, copyright: event.target.value },
                        });
                      }}
                    />
                  </label>
                  {canEditAsset(detailAsset) && (
                    <label className="block space-y-1.5">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Folder
                      </span>
                      <select
                        className={cmsInput}
                        value={detailAsset.folder_id ?? ""}
                        disabled={update.isPending}
                        onChange={(event) =>
                          update.mutate({
                            data: {
                              id: detailAsset.id,
                              folder_id: event.target.value || null,
                            },
                          })
                        }
                      >
                        <option value="">Unfiled</option>
                        {flatFolders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {"—".repeat(folder.depth)} {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Usage tracking
                  </div>
                  {usages.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading usage…</p>
                  ) : !usages.data?.length ? (
                    <p className="text-sm text-muted-foreground">
                      No tracked uses yet. Save articles with this asset, or run Sync usage.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {usages.data.map((usage) => (
                        <li
                          key={usage.id}
                          className="border border-border px-3 py-2 text-sm"
                        >
                          <div className="font-medium text-foreground">
                            {usage.entity_title || usage.entity_type}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                            <span>{usage.field}</span>
                            {usage.entity_path ? (
                              <a
                                href={usage.entity_path}
                                className="underline hover:text-foreground"
                              >
                                Open
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    className={cmsSecondaryButton}
                    onClick={async () => {
                      await navigator.clipboard.writeText(detailAsset.public_url);
                      setCopied(detailAsset.id);
                      window.setTimeout(() => setCopied(null), 1500);
                    }}
                  >
                    {copied === detailAsset.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy URL
                  </button>
                  {(canManageAll || detailAsset.uploaded_by === me.data?.userId) && (
                    <button
                      type="button"
                      className={`${cmsSecondaryButton} text-crimson`}
                      onClick={() => {
                        if (window.confirm(`Permanently delete ${detailAsset.file_name}?`)) {
                          remove.mutate(detailAsset.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <dt className="uppercase tracking-wide">Uploaded</dt>
                    <dd className="mt-1 text-foreground">
                      {new Date(detailAsset.created_at).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide">Uploader</dt>
                    <dd className="mt-1 text-foreground">
                      {detailAsset.profiles?.name || "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide">Bucket</dt>
                    <dd className="mt-1 text-foreground">{detailAsset.bucket}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide">Path</dt>
                    <dd className="mt-1 truncate text-foreground">{detailAsset.object_path}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

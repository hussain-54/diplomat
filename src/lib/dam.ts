export type MediaAssetType = "image" | "video" | "audio" | "document";
export type MediaBucket = "article-hero" | "avatars" | "media-library";

export type MediaFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaFolderNode = MediaFolder & { children: MediaFolderNode[] };

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-wav",
]);

const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
]);

export const DAM_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf";

export const MAX_LIBRARY_BYTES = 50 * 1024 * 1024;
export const MAX_HERO_BYTES = 5 * 1024 * 1024;

export function detectAssetType(mimeType: string): MediaAssetType {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/") || IMAGE_MIMES.has(mime)) return "image";
  if (mime.startsWith("video/") || VIDEO_MIMES.has(mime)) return "video";
  if (mime.startsWith("audio/") || AUDIO_MIMES.has(mime)) return "audio";
  return "document";
}

export function isAllowedMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  return (
    IMAGE_MIMES.has(mime) ||
    VIDEO_MIMES.has(mime) ||
    AUDIO_MIMES.has(mime) ||
    DOCUMENT_MIMES.has(mime) ||
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/")
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function buildFolderTree(folders: MediaFolder[]): MediaFolderNode[] {
  const map = new Map<string, MediaFolderNode>();
  for (const folder of folders) {
    map.set(folder.id, { ...folder, children: [] });
  }
  const roots: MediaFolderNode[] = [];
  for (const folder of folders) {
    const node = map.get(folder.id)!;
    if (folder.parent_id && map.has(folder.parent_id)) {
      map.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: MediaFolderNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}

export function flattenFolderTree(nodes: MediaFolderNode[], depth = 0): Array<MediaFolderNode & { depth: number }> {
  const result: Array<MediaFolderNode & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    result.push(...flattenFolderTree(node.children, depth + 1));
  }
  return result;
}

export function folderDescendantIds(folders: MediaFolder[], rootId: string): Set<string> {
  const children = new Map<string | null, string[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    const list = children.get(key) ?? [];
    list.push(folder.id);
    children.set(key, list);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of children.get(current) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        stack.push(child);
      }
    }
  }
  return ids;
}

export function assetTypeLabel(type: MediaAssetType): string {
  switch (type) {
    case "image":
      return "Images";
    case "video":
      return "Videos";
    case "audio":
      return "Audio";
    case "document":
      return "Documents";
  }
}

export function collectUrlsFromBody(body: string | null | undefined): string[] {
  if (!body) return [];
  const urls = new Set<string>();
  try {
    const parsed = JSON.parse(body) as unknown;
    const walk = (value: unknown) => {
      if (!value) return;
      if (typeof value === "string") {
        if (/^https?:\/\//i.test(value) || value.startsWith("/")) urls.add(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (typeof value === "object") {
        Object.values(value as Record<string, unknown>).forEach(walk);
      }
    };
    walk(parsed);
  } catch {
    const matches = body.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    matches.forEach((url) => urls.add(url));
  }
  return [...urls];
}

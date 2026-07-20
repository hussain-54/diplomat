import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPanel,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { exportTags, importTags, listTagActivity } from "@/lib/admin.functions";

type Format = "csv" | "json" | "excel";

export function TagImportExportPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<Format>("csv");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [skipExisting, setSkipExisting] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);

  const historyQ = useQuery({
    queryKey: ["tag-import-history"],
    queryFn: () => listTagActivity({ data: { action: "tag.import", pageSize: 10 } }),
  });
  const exportHistoryQ = useQuery({
    queryKey: ["tag-export-history"],
    queryFn: () => listTagActivity({ data: { action: "tag.export", pageSize: 10 } }),
  });

  const exportMut = useMutation({
    mutationFn: (fmt: Format) => exportTags({ data: { format: fmt } }),
    onSuccess: (file) => {
      const blob = new Blob([file.content], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
      void qc.invalidateQueries({ queryKey: ["tag-export-history"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: (content: string) =>
      importTags({
        data: { format: format === "excel" ? "csv" : format, content, updateExisting, skipExisting, validateOnly },
      }),
    onSuccess: (result) => {
      toast.success(
        validateOnly
          ? `Validation passed for ${result.imported} rows`
          : `Imported ${result.imported}, skipped ${result.skipped}`,
      );
      if (result.errors.length) toast.message(result.errors.slice(0, 3).join("; "));
      void qc.invalidateQueries({ queryKey: ["tags-table"] });
      void qc.invalidateQueries({ queryKey: ["tag-import-history"] });
      void qc.invalidateQueries({ queryKey: ["tags-library-counts"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const onFile = async (file: File) => {
    const content = await file.text();
    importMut.mutate(content);
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Import / export tags"
        description="Bulk manage tags with CSV, Excel (CSV), or JSON."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Import">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["csv", "excel", "json"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={format === f ? cmsButton : cmsSecondaryButton}
                  onClick={() => setFormat(f)}
                >
                  {f === "excel" ? "Excel" : f.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Drop file or click to upload</span>
              <input
                type="file"
                accept={format === "json" ? ".json" : ".csv,.xls,.xlsx"}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </label>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                />
                Update existing tags
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                />
                Skip existing tags
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={validateOnly}
                  onChange={(e) => setValidateOnly(e.target.checked)}
                />
                Validate before import
              </label>
            </div>
            {importMut.isPending ? <p className="text-sm text-muted-foreground">Importing…</p> : null}
            {importMut.error ? <CmsAlert>{importMut.error.message}</CmsAlert> : null}
          </div>
        </CmsPanel>

        <CmsPanel title="Export">
          <p className="mb-4 text-sm text-muted-foreground">Download all tags with core and SEO fields.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={cmsButton} onClick={() => exportMut.mutate("csv")}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" className={cmsSecondaryButton} onClick={() => exportMut.mutate("excel")}>
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button type="button" className={cmsSecondaryButton} onClick={() => exportMut.mutate("json")}>
              <Download className="h-4 w-4" /> Export JSON
            </button>
          </div>
        </CmsPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Import history">
          <HistoryList items={historyQ.data?.items ?? []} empty="No imports yet." />
        </CmsPanel>
        <CmsPanel title="Export history">
          <HistoryList
            items={exportHistoryQ.data?.items ?? []}
            empty="Exports are downloaded locally; activity appears after logged exports."
          />
        </CmsPanel>
      </div>
    </div>
  );
}

function HistoryList({
  items,
  empty,
}: {
  items: Array<{ id: string; details: string | null; created_at: string; action: string }>;
  empty: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
          <span>{item.details || item.action}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

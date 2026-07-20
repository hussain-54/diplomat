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
import { exportCategories, importCategories, listCategoryActivity } from "@/lib/admin.functions";

export function CategoryImportExportPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [skipExisting, setSkipExisting] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);

  const historyQ = useQuery({
    queryKey: ["category-import-history"],
    queryFn: () => listCategoryActivity({ data: { action: "category.import", pageSize: 10 } }),
  });

  const exportMut = useMutation({
    mutationFn: (fmt: "csv" | "json") => exportCategories({ data: { format: fmt } }),
    onSuccess: (file) => {
      const blob = new Blob([file.content], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    },
    onError: (e) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: (content: string) =>
      importCategories({
        data: { format, content, updateExisting, skipExisting, validateOnly },
      }),
    onSuccess: (result) => {
      toast.success(
        validateOnly
          ? `Validation passed for ${result.imported} rows`
          : `Imported ${result.imported}, skipped ${result.skipped}`,
      );
      void qc.invalidateQueries({ queryKey: ["categories-table"] });
      void qc.invalidateQueries({ queryKey: ["category-import-history"] });
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
        title="Import / export categories"
        description="Bulk manage taxonomy with CSV or JSON."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Import">
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["csv", "json"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={format === f ? cmsButton : cmsSecondaryButton}
                  onClick={() => setFormat(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Drop file or click to upload</span>
              <input
                type="file"
                accept={format === "json" ? ".json" : ".csv"}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </label>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                Update existing categories
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
                Skip existing categories
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={validateOnly} onChange={(e) => setValidateOnly(e.target.checked)} />
                Validate before import
              </label>
            </div>
            {importMut.error ? <CmsAlert>{importMut.error.message}</CmsAlert> : null}
          </div>
        </CmsPanel>

        <CmsPanel title="Export">
          <p className="mb-4 text-sm text-muted-foreground">Download all categories with core fields.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={cmsButton} onClick={() => exportMut.mutate("csv")}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" className={cmsSecondaryButton} onClick={() => exportMut.mutate("json")}>
              <Download className="h-4 w-4" /> Export JSON
            </button>
          </div>
        </CmsPanel>
      </div>

      <CmsPanel title="Import history">
        {(historyQ.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No imports recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {historyQ.data?.items.map((row) => (
              <li key={row.id} className="flex justify-between gap-4 border-b border-border/40 py-2 last:border-0">
                <span>{row.details}</span>
                <span className="shrink-0 text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CmsPanel>
    </div>
  );
}

import type { ReactNode } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { cmsButton, cmsSecondaryButton } from "@/components/cms-ui";
import { DAM_ACCEPT } from "@/lib/dam";
import { cn } from "@/lib/utils";

export function MediaUploader({
  accept = DAM_ACCEPT,
  multiple = false,
  disabled = false,
  busy = false,
  progress,
  onFiles,
  variant = "primary",
  children,
  previewUrl,
  className,
  labelClassName,
}: {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  progress?: string | null;
  onFiles: (files: File[]) => void;
  variant?: "primary" | "secondary";
  children?: ReactNode;
  previewUrl?: string | null;
  className?: string;
  labelClassName?: string;
}) {
  const buttonClass = variant === "secondary" ? cmsSecondaryButton : cmsButton;
  const Icon = multiple ? Upload : ImagePlus;

  return (
    <div className={cn("space-y-3", className)}>
      {previewUrl ? (
        <div className="aspect-video overflow-hidden border border-border bg-muted">
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <label
        className={cn(
          buttonClass,
          "cursor-pointer",
          (disabled || busy) && "pointer-events-none opacity-50",
          labelClassName,
        )}
      >
        <Icon className="h-4 w-4" />
        {busy ? progress || "Uploading…" : children || (multiple ? "Bulk upload" : "Upload")}
        <input
          className="sr-only"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || busy}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            if (files.length) onFiles(files);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

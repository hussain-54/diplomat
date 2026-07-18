import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  description,
  children,
}: {
  label: string;
  hint?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">
        {label}
        {hint ? (
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {description ? (
        <span className="block text-[11px] text-muted-foreground">{description}</span>
      ) : null}
      {children}
    </label>
  );
}

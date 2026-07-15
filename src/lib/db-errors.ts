type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function toAppError(error: unknown, fallback = "Request failed"): Error {
  if (error instanceof Error && !(error as DbErrorLike).code) return error;
  const e = error as DbErrorLike;
  const message = e?.message ?? fallback;
  const lower = message.toLowerCase();
  const detail = [e.code, e.details, e.hint].filter(Boolean).join(" | ");

  if (lower.includes("permission denied") || e.code === "42501") {
    return new Error(
      `Database permission denied. Run supabase/fix-publish-now.sql in the Supabase SQL Editor, then sign out/in. Raw: ${message}${detail ? ` (${detail})` : ""}`,
    );
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return new Error(
      `Publishing blocked by RLS. Contributors can only save drafts — promote to super_admin via fix-publish-now.sql. Raw: ${message}`,
    );
  }
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return new Error(
      `API cache missing admin_upsert_article. Run supabase/fix-publish-now.sql (includes NOTIFY reload). Raw: ${message}`,
    );
  }
  if (lower.includes("duplicate") || e.code === "23505") {
    return new Error("That slug already exists. Choose a different slug and try again.");
  }
  return new Error(detail ? `${message} (${detail})` : message);
}

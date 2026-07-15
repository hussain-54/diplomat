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

  if (lower.includes("permission denied") || e.code === "42501") {
    return new Error(
      "Database denied this write. In Supabase SQL Editor, run supabase/migrations/20260715000000_fix_article_publish_grants.sql",
    );
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return new Error(
      "Publishing blocked by permissions. Contributors can only save drafts. Ask a super admin to grant you section_editor or super_admin (Manage Access), or run the promote SQL in INTEGRATION_GUIDE.md.",
    );
  }
  if (lower.includes("duplicate") || e.code === "23505") {
    return new Error("That slug already exists. Choose a different slug and try again.");
  }
  return new Error(message);
}

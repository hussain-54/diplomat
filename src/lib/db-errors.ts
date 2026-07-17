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
  const devDetails = import.meta.env.DEV
    ? ` (${[message, detail].filter(Boolean).join(" | ")})`
    : "";

  if (lower.includes("permission denied") || e.code === "42501") {
    return new Error(`You do not have permission to perform this action.${devDetails}`);
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return new Error(`Your newsroom role does not allow this change.${devDetails}`);
  }
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return new Error(`The publishing service is temporarily unavailable.${devDetails}`);
  }
  if (lower.includes("duplicate") || e.code === "23505") {
    return new Error("That slug already exists. Choose a different slug and try again.");
  }
  if (e.code === "23514" && lower.includes("super admin")) {
    return new Error("At least one super admin must remain assigned.");
  }
  return new Error(import.meta.env.DEV && detail ? `${message} (${detail})` : fallback);
}

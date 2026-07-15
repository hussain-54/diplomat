/** Safely turn unknown thrown values into a display string. */
export function safeErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const e = error as { message?: unknown; error?: unknown; statusMessage?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.statusMessage === "string" && e.statusMessage) return e.statusMessage;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  try {
    return String(error);
  } catch {
    return fallback;
  }
}

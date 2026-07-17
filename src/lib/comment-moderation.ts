export type AutoFlag = "spam" | "profanity" | "link_spam" | "repeated_chars";

const PROFANITY_PATTERNS: RegExp[] = [
  /\b(fuck|fucking|fucker|shit|bullshit|asshole|bastard|bitch|damn|cunt|dick|piss|slut|whore)\b/i,
  /\b(motherfucker|cock|pussy|faggot|nigger|retard)\b/i,
];

const SPAM_PHRASES: RegExp[] = [
  /\b(buy now|click here|free money|work from home|crypto giveaway|double your|make \$\d+)\b/i,
  /\b(viagra|cialis|casino|lottery winner|nigerian prince|telegram @)\b/i,
  /\b(seo services|backlinks|followers cheap|onlyfans)\b/i,
];

const URL_PATTERN = /https?:\/\/|www\.|\.(com|net|org|io|xyz|info)\b/gi;

export type CommentScanResult = {
  flags: AutoFlag[];
  status: "pending" | "flagged" | "spam";
  note: string | null;
};

function hasProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(text));
}

function hasSpamPhrase(text: string): boolean {
  return SPAM_PHRASES.some((pattern) => pattern.test(text));
}

function linkCount(text: string): number {
  return (text.match(URL_PATTERN) ?? []).length;
}

function hasRepeatedChars(text: string): boolean {
  return /(.)\1{7,}/.test(text) || /([A-Z\s]){20,}/.test(text);
}

export function scanCommentContent(input: {
  body: string;
  authorName?: string;
  authorEmail?: string;
}): CommentScanResult {
  const body = input.body.trim();
  const flags: AutoFlag[] = [];

  if (hasProfanity(body) || hasProfanity(input.authorName ?? "")) {
    flags.push("profanity");
  }
  if (hasSpamPhrase(body)) {
    flags.push("spam");
  }
  if (linkCount(body) >= 3) {
    flags.push("link_spam");
  }
  if (hasRepeatedChars(body)) {
    flags.push("repeated_chars");
  }

  const email = (input.authorEmail ?? "").toLowerCase();
  if (
    /@(mailinator|guerrillamail|tempmail|10minutemail|yopmail)\./i.test(email) ||
    /\.(ru|cn|xyz|top|click)$/i.test(email.split("@")[1] ?? "")
  ) {
    if (!flags.includes("spam")) flags.push("spam");
  }

  let status: CommentScanResult["status"] = "pending";
  if (flags.includes("spam") || flags.includes("link_spam")) {
    status = "spam";
  } else if (flags.includes("profanity") || flags.includes("repeated_chars")) {
    status = "flagged";
  }

  const note = flags.length
    ? `Auto-detected: ${flags.join(", ")}`
    : null;

  return { flags, status, note };
}

export function containsProfanity(text: string): boolean {
  return hasProfanity(text);
}

export function detectSpam(text: string): boolean {
  return hasSpamPhrase(text) || linkCount(text) >= 3;
}

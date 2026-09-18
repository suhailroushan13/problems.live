/** Collapse whitespace and hard-trim — used before persisting user text. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Capitalizes the first letter of each space-separated word, lowercasing the
 * rest — the default casing for a name at the point it first enters the
 * system (waitlist join, invite, Google sign-in). Only applied at those
 * entry points; a person's own later edit to their name is stored exactly
 * as they typed it.
 */
export function toTitleCase(input: string): string {
  return input
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

export function excerpt(input: string, maxLength = 180): string {
  const flat = input.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Strips Markdown syntax down to its plain reading text, for the places a
 * description shows up as a one-line preview (list cards, search results,
 * `<meta description>`) rather than fully rendered. Line-based rules run
 * first so `#`/`>`/list markers only strip when they actually start a line.
 */
export function stripMarkdown(input: string): string {
  const withoutLinePrefixes = input
    .split("\n")
    .map((line) => line.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/, ""))
    .join("\n");

  return withoutLinePrefixes
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => alt || "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*\*|___)(.*?)\1/g, "$2")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .trim();
}

/**
 * Escape a user string so it can be safely embedded in a RegExp. Without this,
 * a search for "c++" or "(" throws, and crafted input can cause catastrophic
 * backtracking.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "a","an","and","are","as","at","be","but","by","can","do","for","from","get",
  "has","have","how","i","in","is","it","its","my","no","not","of","on","or",
  "our","that","the","then","there","these","they","this","to","too","us","was",
  "we","what","when","where","which","who","why","will","with","you","your",
]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Jaccard overlap of significant tokens — cheap, no model required. */
export function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;

  return intersection / (setA.size + setB.size - intersection);
}

/** Character-trigram cosine — catches typos and word-order differences. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const padded = ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
    const out = new Set<string>();
    for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
    return out;
  };

  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;

  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared += 1;

  return shared / Math.sqrt(ga.size * gb.size);
}

/**
 * Strip anything that could execute or phish when rendered. We render user
 * text as plain text (never dangerouslySetInnerHTML), but defence in depth
 * keeps malicious payloads out of the database in the first place.
 */
export function stripUnsafe(input: string): string {
  return input
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|link|meta)[^>]*>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/on[a-z]+\s*=/gi, "");
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

export function extractUrls(input: string): string[] {
  return input.match(URL_PATTERN) ?? [];
}

/**
 * Split text into plain runs and links so comments can render clickable URLs
 * without ever touching innerHTML.
 */
export type TextSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string; href: string };

export function segmentText(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", value: input.slice(lastIndex, index) });
    }
    const raw = match[0];
    // Trailing punctuation is almost never part of the URL.
    const trimmed = raw.replace(/[.,;:!?]+$/, "");
    segments.push({ kind: "link", value: trimmed, href: trimmed });
    if (trimmed.length < raw.length) {
      segments.push({ kind: "text", value: raw.slice(trimmed.length) });
    }
    lastIndex = index + raw.length;
  }

  if (lastIndex < input.length) {
    segments.push({ kind: "text", value: input.slice(lastIndex) });
  }

  return segments;
}

export type BioSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "link"; value: string; href: string };

const BIO_INLINE_PATTERN =
  /\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|(https?:\/\/[^\s<>"')\]]+)/g;

/**
 * Parses a small, safe Markdown subset for profile bios — **bold**,
 * *italic*, and auto-linked URLs — into segments a component can render as
 * real React elements. There is no HTML string at any point, so (unlike a
 * general Markdown renderer) there is nothing that needs sanitizing.
 */
export function parseBioSegments(input: string): BioSegment[] {
  const segments: BioSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(BIO_INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", value: input.slice(lastIndex, index) });
    }

    const [raw, bold, italic, url] = match;
    if (bold !== undefined) {
      segments.push({ kind: "bold", value: bold });
    } else if (italic !== undefined) {
      segments.push({ kind: "italic", value: italic });
    } else if (url !== undefined) {
      const trimmed = url.replace(/[.,;:!?]+$/, "");
      segments.push({
        kind: "link",
        value: trimmed.replace(/^https?:\/\//i, ""),
        href: trimmed,
      });
      if (trimmed.length < url.length) {
        segments.push({ kind: "text", value: url.slice(trimmed.length) });
      }
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < input.length) {
    segments.push({ kind: "text", value: input.slice(lastIndex) });
  }

  return segments;
}

/**
 * Users often paste a full profile URL ("https://github.com/name") instead
 * of just their handle — strip the domain and any leading "@" so we store
 * (and later build links from) a bare username consistently.
 */
export function normalizeSocialHandle(input: string, maxLength: number): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?[^/]+\//i, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "")
    .slice(0, maxLength);
}

/**
 * A portfolio link is stored as a full URL rather than a handle — this just
 * trims it, drops a trailing slash, and adds a protocol if the user typed a
 * bare domain like "yoursite.com".
 */
export function normalizeWebsiteUrl(input: string, maxLength: number): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.slice(0, maxLength);
}

/** Collapse whitespace and hard-trim — used before persisting user text. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function excerpt(input: string, maxLength = 180): string {
  const flat = input.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
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

/**
 * URL-safe slug generation. Unicode letters are transliterated away via NFKD
 * so non-Latin titles still produce a usable (if short) slug.
 */
export function slugify(input: string, maxLength = 72): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return "";
  if (base.length <= maxLength) return base;

  // Trim on a word boundary rather than mid-word.
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut).replace(
    /-+$/,
    ""
  );
}

/**
 * Given a desired slug and a set of slugs already taken, produce a unique one:
 * `finding-roommates`, `finding-roommates-2`, `finding-roommates-3`, ...
 */
export function nextAvailableSlug(base: string, taken: Set<string>): string {
  const seed = base || "problem";
  if (!taken.has(seed)) return seed;
  let n = 2;
  while (taken.has(`${seed}-${n}`)) n += 1;
  return `${seed}-${n}`;
}

export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 24);
  return cleaned.length >= 2 ? cleaned : "user";
}

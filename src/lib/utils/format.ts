/** 2431 -> "2,431" */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en").format(Math.max(0, Math.round(n || 0)));
}

/** 2431 -> "2.4k" — for tight spots like nav badges. */
export function formatCompact(n: number): string {
  const value = Math.max(0, Math.round(n || 0));
  if (value < 1000) return String(value);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .toLowerCase();
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/** "2,431 people" / "1 person" */
export function countLabel(n: number, one: string, many?: string): string {
  return `${formatCount(n)} ${pluralize(n, one, many)}`;
}

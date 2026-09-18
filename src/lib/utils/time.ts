const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * Compact relative time — "4h ago", "3d ago". Deliberately hand-rolled: a date
 * library would be the single largest dependency in the bundle for 20 lines.
 */
export function timeAgo(date: Date | string | number): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 45) return "just now";
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d ago`;
  if (seconds < MONTH) return `${Math.floor(seconds / WEEK)}w ago`;
  if (seconds < YEAR) return `${Math.floor(seconds / MONTH)}mo ago`;
  return `${Math.floor(seconds / YEAR)}y ago`;
}

/**
 * Plain-words relative time — "2 weeks ago" rather than "2w ago". Used
 * anywhere the metadata is meant to be read rather than scanned.
 */
export function timeAgoLong(date: Date | string | number): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (seconds < 60) return "just now";
  if (seconds < HOUR) return plural(Math.floor(seconds / MINUTE), "minute");
  if (seconds < DAY) return plural(Math.floor(seconds / HOUR), "hour");
  if (seconds < WEEK) return plural(Math.floor(seconds / DAY), "day");
  if (seconds < MONTH) return plural(Math.floor(seconds / WEEK), "week");
  if (seconds < YEAR) return plural(Math.floor(seconds / MONTH), "month");
  return plural(Math.floor(seconds / YEAR), "year");
}

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTimeWithSeconds(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export function formatMonthYear(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
